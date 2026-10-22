"""账号私有书架。图片/音频 BLOB 与书页清单同库，沿用 SQLite 一致性备份。"""
import base64
import hashlib
import json
import re
import time

from fastapi import HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool
from backend.photo_reading import MAX_IMAGE, fail, image_data, sentences_result

MAX_STORAGE = 512 * 1024 * 1024
MAX_BOOKS = 100
MAX_PAGES = 100
SCHEMA = """
CREATE TABLE IF NOT EXISTS photo_assets (
 owner TEXT NOT NULL REFERENCES accounts(id), id TEXT NOT NULL,
 mime TEXT NOT NULL, data BLOB NOT NULL, PRIMARY KEY(owner,id)
);
CREATE TABLE IF NOT EXISTS photo_books (
 owner TEXT NOT NULL REFERENCES accounts(id), id TEXT NOT NULL,
 revision INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 payload TEXT NOT NULL, mutation TEXT NOT NULL, fingerprint TEXT NOT NULL,
 PRIMARY KEY(owner,id)
);
CREATE TABLE IF NOT EXISTS photo_audio (
 owner TEXT NOT NULL REFERENCES accounts(id), id TEXT NOT NULL,
 data BLOB NOT NULL, PRIMARY KEY(owner,id)
);
"""


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{16,64}', value):
        fail('bookInvalid')
    return value


def capacity(db, owner, extra):
    used = sum(db.execute(f'SELECT COALESCE(SUM(length(data)),0) FROM {table} WHERE owner=?', (owner,)).fetchone()[0]
               for table in ('photo_assets', 'photo_audio'))
    used += db.execute('SELECT COALESCE(SUM(length(CAST(payload AS BLOB))),0) FROM photo_books WHERE owner=?', (owner,)).fetchone()[0]
    if used + extra > MAX_STORAGE:
        fail('libraryFull', 413)


def audio_id(model, content):
    return hashlib.sha256(('verbatim-v1\n' + model + '\n' + content).encode()).hexdigest()


def stored_audio(store, owner, key):
    with store.connection() as db:
        row = db.execute('SELECT data FROM photo_audio WHERE owner=? AND id=?', (owner, key)).fetchone()
        return row['data'] if row else None


def save_audio(store, owner, key, data, authorize=None):
    with store.connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if authorize:
            authorize(db)
        if not db.execute('SELECT 1 FROM photo_audio WHERE owner=? AND id=?', (owner, key)).fetchone():
            capacity(db, owner, len(data))
            db.execute('INSERT INTO photo_audio VALUES (?,?,?)', (owner, key, data))


def install(app, store, account, body):
    with store.connection() as db:
        db.executescript(SCHEMA)

    def owned(request, db=None, write=False):
        identity = account(request, write=write, connection=db)
        if request.query_params.get('expected_account_id', identity['id']) != identity['id']:
            fail('accountChanged', 409)
        return identity['id']

    async def values(request, limit):
        owner = owned(request, write=True)
        data = await body(request, limit)
        if data.get('expected_account_id') != owner:
            fail('accountChanged', 409)
        return owner, data

    def unpack(row):
        return {**json.loads(row['payload']), 'revision': row['revision'], 'updated_at': row['updated_at']}

    @app.get('/api/photo-reading/books')
    def books(request: Request):
        with store.connection() as db:
            owner = owned(request, db)
            rows = db.execute('SELECT * FROM photo_books WHERE owner=? ORDER BY updated_at DESC', (owner,)).fetchall()
        return {'account_id': owner, 'books': [{k: b[k] for k in ('id', 'title', 'revision', 'updated_at')} | {'count': len(b['pages'])}
                                             for b in map(unpack, rows)]}

    @app.get('/api/photo-reading/books/{book_id}')
    def book(book_id: str, request: Request):
        with store.connection() as db:
            owner = owned(request, db)
            row = db.execute('SELECT * FROM photo_books WHERE owner=? AND id=?', (owner, identifier(book_id))).fetchone()
            if not row:
                fail('bookMissing', 404)
            return {'account_id': owner, 'book': unpack(row)}

    @app.post('/api/photo-reading/assets')
    async def asset(request: Request):
        owner, data = await values(request, MAX_IMAGE * 4 // 3 + 1024)
        image = await run_in_threadpool(image_data, data.get('image'))
        prefix, encoded = image.split(',', 1)
        raw = base64.b64decode(encoded)
        key = hashlib.sha256(raw).hexdigest()
        with store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            owned(request, db, True)
            if not db.execute('SELECT 1 FROM photo_assets WHERE owner=? AND id=?', (owner, key)).fetchone():
                capacity(db, owner, len(raw))
                db.execute('INSERT INTO photo_assets VALUES (?,?,?,?)', (owner, key, prefix[5:-7], raw))
        return {'account_id': owner, 'id': key}

    @app.get('/api/photo-reading/assets/{asset_id}')
    def get_asset(asset_id: str, request: Request):
        with store.connection() as db:
            owner = owned(request, db)
            row = db.execute('SELECT mime,data FROM photo_assets WHERE owner=? AND id=?', (owner, asset_id)).fetchone()
            if not row:
                fail('bookMissing', 404)
            return Response(row['data'], media_type=row['mime'])

    @app.post('/api/photo-reading/books/{book_id}')
    async def save(book_id: str, request: Request):
        owner, data = await values(request, 4 * 1024 * 1024)
        identifier(book_id)
        mutation = identifier(data.get('mutation_id'))
        revision, title, pages = data.get('revision'), data.get('title'), data.get('pages')
        if type(revision) is not int or revision < 0 or not isinstance(title, str) or not 1 <= len(title.strip()) <= 100:
            fail('bookInvalid')
        if not isinstance(pages, list) or len(pages) > MAX_PAGES:
            fail('bookInvalid')
        clean, ids = [], set()
        for page in pages:
            if not isinstance(page, dict):
                fail('bookInvalid')
            pid, image = identifier(page.get('id')), page.get('image_id')
            if pid in ids or not isinstance(image, str) or not re.fullmatch(r'[a-f0-9]{64}', image):
                fail('bookInvalid')
            ids.add(pid)
            state = page.get('state')
            if not isinstance(state, str) or state not in {'pending', 'ready', 'error'}:
                fail('bookInvalid')
            try:
                result = sentences_result({'sentences': page.get('sentences'), 'needs_review': page.get('review')})
            except HTTPException:
                fail('bookInvalid')
            clean.append({'id': pid, 'image_id': image, 'state': state, 'sentences': result['sentences'],
                          'review': result['needs_review']})
        payload = json.dumps({'id': book_id, 'title': title.strip(), 'pages': clean}, ensure_ascii=False, sort_keys=True)
        fingerprint = hashlib.sha256(payload.encode()).hexdigest()
        with store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            owned(request, db, True)
            row = db.execute('SELECT * FROM photo_books WHERE owner=? AND id=?', (owner, book_id)).fetchone()
            if row and row['mutation'] == mutation:
                if row['fingerprint'] != fingerprint:
                    fail('bookConflict', 409)
                return {'account_id': owner, 'revision': row['revision']}
            if revision != (row['revision'] if row else 0):
                fail('bookConflict', 409)
            if not row and db.execute('SELECT count(*) FROM photo_books WHERE owner=?', (owner,)).fetchone()[0] >= MAX_BOOKS:
                fail('libraryFull', 413)
            for page in clean:
                if not db.execute('SELECT 1 FROM photo_assets WHERE owner=? AND id=?', (owner, page['image_id'])).fetchone():
                    fail('bookInvalid')
            capacity(db, owner, len(payload.encode()) - (len(row['payload'].encode()) if row else 0))
            db.execute('INSERT INTO photo_books VALUES (?,?,?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET '
                       'revision=excluded.revision,updated_at=excluded.updated_at,payload=excluded.payload,mutation=excluded.mutation,fingerprint=excluded.fingerprint',
                       (owner, book_id, revision + 1, int(time.time()), payload, mutation, fingerprint))
        return {'account_id': owner, 'revision': revision + 1}

    @app.post('/api/photo-reading/books/{book_id}/delete')
    async def delete(book_id: str, request: Request):
        owner, data = await values(request, 2048)
        with store.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            owned(request, db, True)
            row = db.execute('SELECT * FROM photo_books WHERE owner=? AND id=?', (owner, identifier(book_id))).fetchone()
            if row:
                if type(data.get('revision')) is not int or row['revision'] != data['revision']:
                    fail('bookConflict', 409)
                db.execute('DELETE FROM photo_books WHERE owner=? AND id=?', (owner, book_id))
                retained = [p for r in db.execute('SELECT payload FROM photo_books WHERE owner=?', (owner,))
                            for p in json.loads(r['payload'])['pages']]
                # 删除书本时同时回收旧版本/中断上传留下的无引用资源。
                images = {r['id'] for r in db.execute('SELECT id FROM photo_assets WHERE owner=?', (owner,))}
                for image in images - {p['image_id'] for p in retained}:
                    db.execute('DELETE FROM photo_assets WHERE owner=? AND id=?', (owner, image))
                def keys(pages):
                    return {audio_id(app.state.photo_reading.provider.voice_model, r['language'] + '\n' + r['text'])
                            for p in pages for r in p['sentences']}
                audio = {r['id'] for r in db.execute('SELECT id FROM photo_audio WHERE owner=?', (owner,))}
                for key in audio - keys(retained):
                    db.execute('DELETE FROM photo_audio WHERE owner=? AND id=?', (owner, key))
        return {'account_id': owner, 'ok': True}
