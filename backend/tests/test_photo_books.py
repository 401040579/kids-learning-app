import copy
import uuid

from fastapi.testclient import TestClient
from backend.photo_books import audio_id
from backend.service import Settings, create_app
from backend.tests.test_photo_reading import setup, no_real_credentials, photo, PAGE, PASSWORD, ORIGIN, post


def ident():
    return str(uuid.uuid4())


def image(browser, owner):
    r = post(browser, owner, 'assets', image=photo())
    assert r.status_code == 200, r.text
    return r.json()['id']


def payload(asset, **kw):
    return {'title': 'Iris book', 'revision': 0, 'mutation_id': ident(), 'pages': [
        {'id': ident(), 'image_id': asset, 'state': 'ready', 'sentences': PAGE['sentences'], 'review': True}], **kw}


def test_private_book_roundtrip_idempotency_conflict_and_restart(setup):
    app, browser, owner = setup
    asset = image(browser, owner)
    assert image(browser, owner) == asset
    book = ident()
    data = payload(asset)
    first = post(browser, owner, 'books/' + book, **data)
    assert first.status_code == 200
    assert first.json()['revision'] == 1
    assert post(browser, owner, 'books/' + book, **data).json()['revision'] == 1
    bad = {**data, 'title': 'changed'}
    assert post(browser, owner, 'books/' + book, **bad).status_code == 409
    assert post(browser, owner, 'books/' + book, **{**bad, 'mutation_id': ident()}).status_code == 409
    saved = browser.get('/api/photo-reading/books/' + book).json()['book']
    assert saved['pages'] == data['pages']
    assert 'image' not in saved['pages'][0]
    raw = browser.get('/api/photo-reading/assets/' + asset)
    assert raw.headers['content-type'] == 'image/jpeg'
    assert raw.headers['cache-control'] == 'no-store'
    updated = {**data, 'revision': 1, 'mutation_id': ident(), 'title': 'Updated', 'pages': data['pages'] * 2}
    assert post(browser, owner, 'books/' + book, **updated).status_code == 422  # duplicate page IDs
    updated['pages'][1] = {**data['pages'][0], 'id': ident()}
    assert post(browser, owner, 'books/' + book, **updated).json()['revision'] == 2
    # Fresh service using the same DB retains the complete book and private image.
    restarted = create_app(Settings(app.state.store.path, (ORIGIN,)))
    client = TestClient(restarted, base_url='https://accounts.example', headers={'Origin': ORIGIN})
    client.cookies.update(browser.cookies)
    assert client.get('/api/photo-reading/books').json()['books'][0]['title'] == 'Updated'
    assert client.get('/api/photo-reading/assets/' + asset).content == raw.content


def test_book_tenant_csrf_origin_and_asset_validation(setup):
    app, browser, owner = setup
    asset, book = image(browser, owner), ident()
    assert post(browser, owner, 'books/' + book, **payload(asset)).status_code == 200
    other = TestClient(app, base_url='https://accounts.example', headers={'Origin': ORIGIN})
    identity = other.post('/api/login', json={'username': 'other', 'password': PASSWORD}).json()
    other.headers['X-CSRF-Token'] = identity['csrf']
    assert other.get('/api/photo-reading/books').json()['books'] == []
    assert other.get('/api/photo-reading/books/' + book).status_code == 404
    assert other.get('/api/photo-reading/assets/' + asset).status_code == 404
    assert other.get('/api/photo-reading/books?expected_account_id=' + owner).status_code == 409
    assert post(other, owner, 'books/' + book, **payload(asset)).status_code == 409
    assert post(other, identity['id'], 'books/' + book, **payload(asset)).status_code == 422
    assert browser.post('/api/photo-reading/assets', headers={'Origin': 'https://evil.example'}).status_code == 403
    browser.headers['X-CSRF-Token'] = 'bad'
    assert post(browser, owner, 'books/' + book, **payload(asset)).status_code == 403
    assert post(browser, owner, 'books/' + book + '/delete', revision=1).status_code == 403


def test_audio_survives_cache_expiry_restart_without_provider_key(setup):
    app, browser, owner = setup
    service = app.state.photo_reading
    service.provider.key = 'test'
    calls = []
    async def speech(text, language):
        calls.append(text)
        return b'RIFF-persistent-test'
    service.provider.speech = speech
    assert post(browser, owner, 'speech', text='Hello.', language='en-US').content == b'RIFF-persistent-test'
    service.cache.clear()
    service.provider.key = ''
    assert post(browser, owner, 'speech', text='Hello.', language='en-US').content == b'RIFF-persistent-test'
    assert calls == ['Hello.']
    assert post(browser, owner, 'speech', text='New sentence.', language='en-US').status_code == 503


def test_quota_and_atomic_invalid_save_leave_original_book(setup, monkeypatch):
    from backend import photo_books
    app, browser, owner = setup
    monkeypatch.setattr(photo_books, 'MAX_STORAGE', 1)
    assert post(browser, owner, 'assets', image=photo()).json()['detail']['code'] == 'libraryFull'
    monkeypatch.setattr(photo_books, 'MAX_STORAGE', 512 * 1024 * 1024)
    asset, book = image(browser, owner), ident()
    data = payload(asset)
    assert post(browser, owner, 'books/' + book, **data).status_code == 200
    data = copy.deepcopy(data)
    data.update(revision=1, mutation_id=ident())
    data['pages'][0]['image_id'] = 'f' * 64
    assert post(browser, owner, 'books/' + book, **data).status_code == 422
    assert browser.get('/api/photo-reading/books/' + book).json()['book']['revision'] == 1
    data['pages'] *= 101
    assert post(browser, owner, 'books/' + book, **data).status_code == 422


def test_delete_protects_shared_assets_and_audio(setup):
    app, browser, owner = setup
    asset = image(browser, owner)
    a, b = ident(), ident()
    data = payload(asset)
    assert post(browser, owner, 'books/' + a, **data).status_code == 200
    assert post(browser, owner, 'books/' + b, **payload(asset)).status_code == 200
    key = audio_id(app.state.photo_reading.provider.voice_model, 'en-US\n' + PAGE['sentences'][0]['text'])
    with app.state.store.connection() as db:
        db.execute('INSERT INTO photo_audio VALUES (?,?,?)', (owner, key, b'audio'))
    assert post(browser, owner, 'books/' + a + '/delete', revision=0).status_code == 409
    assert post(browser, owner, 'books/' + a + '/delete', revision=1).status_code == 200
    assert browser.get('/api/photo-reading/assets/' + asset).status_code == 200
    assert post(browser, owner, 'books/' + b + '/delete', revision=1).status_code == 200
    assert browser.get('/api/photo-reading/assets/' + asset).status_code == 404
    with app.state.store.connection() as db:
        assert db.execute('SELECT count(*) FROM photo_audio').fetchone()[0] == 0
    assert post(browser, owner, 'books/' + b + '/delete', revision=1).status_code == 200


def test_revocation_during_audio_generation_cannot_persist_audio(setup):
    app, browser, owner = setup
    service = app.state.photo_reading
    service.provider.key = 'test'
    async def revoke(text, language):
        app.state.store.administer('reader', disable=True)
        return b'RIFF-revoked'
    service.provider.speech = revoke
    assert post(browser, owner, 'speech', text='Do not save.', language='en-US').status_code == 401
    with app.state.store.connection() as db:
        assert db.execute('SELECT count(*) FROM photo_audio').fetchone()[0] == 0


def test_sqlite_backup_includes_private_photos_books_and_audio(setup, tmp_path):
    import sqlite3
    from backend.backup import backup_database
    app, browser, owner = setup
    asset, book = image(browser, owner), ident()
    assert post(browser, owner, 'books/' + book, **payload(asset)).status_code == 200
    with app.state.store.connection() as db:
        db.execute('INSERT INTO photo_audio VALUES (?,?,?)', (owner, 'fixture-key', b'private-audio'))
    backup = backup_database(app.state.store.path, tmp_path / 'backups')
    with sqlite3.connect(backup) as db:
        assert db.execute('SELECT count(*) FROM sessions').fetchone()[0] == 0
        assert db.execute('SELECT data FROM photo_audio').fetchone()[0] == b'private-audio'
        assert db.execute('SELECT count(*) FROM photo_books').fetchone()[0] == 1
        assert db.execute('SELECT length(data) FROM photo_assets').fetchone()[0] > 0


def test_malformed_client_pages_rejected_without_server_error(setup):
    app, browser, owner = setup
    data = payload(image(browser, owner))
    for key, value in [('state', []), ('sentences', 'bad'), ('review', 1)]:
        bad = copy.deepcopy(data)
        bad['pages'][0][key] = value
        result = post(browser, owner, 'books/' + ident(), **bad)
        assert result.status_code == 422
        assert result.json()['detail']['code'] == 'bookInvalid'
