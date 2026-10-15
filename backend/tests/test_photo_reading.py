import asyncio
import base64
import io
import json
import wave

import httpx
import pytest
from PIL import Image
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend import photo_reading as reading
from backend.service import Settings, create_app

ORIGIN = 'https://app.tao.irish'
PASSWORD = 'photo-test-password-123456'
PAGE = {'sentences': [{'text': 'Hello, little cat!', 'language': 'en-US', 'uncertain': False},
                      {'text': '小猫，你好。', 'language': 'zh-CN', 'uncertain': True}], 'needs_review': True}


@pytest.fixture(autouse=True)
def no_real_credentials(tmp_path, monkeypatch):
    monkeypatch.delenv('PHOTO_READING_OPENAI_KEY', raising=False)
    monkeypatch.setenv('PHOTO_READING_KEY_FILE', str(tmp_path / 'missing.key'))


def photo():
    f = io.BytesIO()
    Image.new('RGB', (30, 30), 'white').save(f, format='JPEG')
    return 'data:image/jpeg;base64,' + base64.b64encode(f.getvalue()).decode()


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.delenv('PHOTO_READING_OPENAI_KEY', raising=False)
    monkeypatch.setenv('PHOTO_READING_KEY_FILE', str(tmp_path / 'missing.key'))
    app = create_app(Settings(tmp_path / 'test.sqlite3', (ORIGIN,)))
    owner = app.state.store.create_account('reader', 'Reader', PASSWORD)
    app.state.store.create_account('other', 'Other', PASSWORD)
    browser = TestClient(app, base_url='https://accounts.example', headers={'Origin': ORIGIN})
    result = browser.post('/api/login', json={'username': 'reader', 'password': PASSWORD}).json()
    browser.headers['X-CSRF-Token'] = result['csrf']
    return app, browser, owner


def post(browser, owner, action='recognize', **kw):
    return browser.post('/api/photo-reading/' + action, json={'expected_account_id': owner, **kw})


def test_auth_origin_csrf_owner_and_disabled_provider(setup):
    app, browser, owner = setup
    guest = TestClient(app, base_url='https://accounts.example', headers={'Origin': ORIGIN})
    assert guest.get('/api/photo-reading/status').status_code == 401
    assert post(guest, owner, image=photo()).status_code == 401
    assert browser.get('/api/photo-reading/status').json() == {'configured': False}
    assert post(browser, owner, image=photo()).json()['detail']['code'] == 'notConfigured'
    assert post(browser, 'other', image=photo()).status_code == 409
    assert browser.post('/api/photo-reading/speech', headers={'Origin': 'https://evil.example'}).status_code == 403
    browser.headers['X-CSRF-Token'] = 'invalid'
    assert post(browser, owner, image=photo()).status_code == 403


def test_validation_before_provider(setup):
    app, browser, owner = setup
    app.state.photo_reading.provider.key = 'test'
    for value in ['', 'https://example.com/a.jpg', 'data:image/jpeg;base64,aGVsbG8=', photo().replace('image/jpeg', 'image/svg+xml')]:
        assert post(browser, owner, image=value).status_code == 422
    assert browser.post('/api/photo-reading/recognize', content=b' ' * (reading.MAX_IMAGE * 4 // 3 + 1100)).status_code == 413
    for text, lang in [('', 'zh-CN'), ('x' * 801, 'en-US'), ('Hi', 'fr'), (None, 'en-US'), ('Hi', [])]:
        assert post(browser, owner, 'speech', text=text, language=lang).status_code == 422


def test_cache_and_isolation_and_no_photo_persistence(setup):
    app, browser, owner = setup
    service = app.state.photo_reading
    service.provider.key = 'test'
    calls = []
    async def recognize(image):
        calls.append('ocr')
        return PAGE
    async def speech(text, lang):
        calls.append((text, lang))
        return b'RIFF-test-audio'
    service.provider.recognize = recognize
    service.provider.speech = speech
    for _ in range(2):
        result = post(browser, owner, image=photo())
        assert result.status_code == 200
        assert result.json()['sentences'] == PAGE['sentences']
        assert result.headers['Cache-Control'] == 'no-store'
        result = post(browser, owner, 'speech', text='你好。', language='zh-CN')
        assert result.content == b'RIFF-test-audio'
        assert result.headers['content-type'] == 'audio/wav'
    assert len(calls) == 2
    with app.state.store.connection() as db:
        assert db.execute('SELECT count(*) FROM snapshots').fetchone()[0] == 0
        assert db.execute('SELECT attempts FROM login_limits WHERE bucket=?', (f'photo:{owner}:ocr:day',)).fetchone()[0] == 1
    other = TestClient(app, base_url='https://accounts.example', headers={'Origin': ORIGIN})
    identity = other.post('/api/login', json={'username': 'other', 'password': PASSWORD}).json()
    other.headers['X-CSRF-Token'] = identity['csrf']
    assert post(other, identity['id'], image=photo()).status_code == 200
    assert len(calls) == 3


def test_revoke_during_generation(setup):
    app, browser, owner = setup
    service = app.state.photo_reading
    service.provider.key = 'test'
    async def recognize(image):
        app.state.store.administer('reader', disable=True)
        return PAGE
    service.provider.recognize = recognize
    assert post(browser, owner, image=photo()).status_code == 401


def test_busy_error_retry_and_persistent_quota(setup):
    app, browser, owner = setup
    service = app.state.photo_reading
    service.provider.key = 'test'
    async def scenario():
        started, finish = asyncio.Event(), asyncio.Event()
        async def generate():
            started.set()
            await finish.wait()
            return PAGE
        task = asyncio.create_task(service.run(owner, 'ocr', 'a', generate))
        await started.wait()
        with pytest.raises(HTTPException) as err:
            await service.run(owner, 'ocr', 'a', generate)
        assert err.value.detail['code'] == 'busy'
        finish.set()
        await task
        async def broken():
            raise HTTPException(502)
        with pytest.raises(HTTPException):
            await service.run(owner, 'ocr', 'b', broken)
        assert not service.active
        assert await service.run(owner, 'ocr', 'b', generate) == PAGE
    asyncio.run(scenario())
    with app.state.store.connection() as db:
        db.execute('UPDATE login_limits SET attempts=50 WHERE bucket=?', (f'photo:{owner}:ocr:day',))
    with pytest.raises(HTTPException) as err:
        reading.ReadingService(app.state.store).limit(owner, 'ocr')
    assert err.value.status_code == 429


@pytest.mark.parametrize('bad', [None, {'sentences': [], 'needs_review': 'no'},
    {'sentences': [{'text':'a','language':'fr','uncertain':False}], 'needs_review':False},
    {'sentences': [{'text':'a'*801,'language':'en-US','uncertain':False}], 'needs_review':False}])
def test_invalid_model_output_rejected(bad):
    with pytest.raises(HTTPException):
        reading.sentences_result(bad)


def test_http_provider_contract(monkeypatch):
    seen = []
    def handle(request):
        values = json.loads(request.content)
        seen.append(values)
        assert values['store'] is False
        assert values['input'][0]['content'][0]['type'] == 'input_image'
        assert values['text']['format']['strict'] is True
        return httpx.Response(200, json={'status': 'completed', 'output': [{'type':'message', 'content':[
            {'type':'output_text', 'text':json.dumps(PAGE)}]}]})
    client = httpx.AsyncClient
    monkeypatch.setattr(reading.httpx, 'AsyncClient', lambda **kw: client(transport=httpx.MockTransport(handle), **kw))
    result = asyncio.run(reading.Provider().recognize(photo()))
    assert result == PAGE
    assert len(seen) == 1


def test_realtime_provider_wav_and_incomplete_rejection(monkeypatch):
    sent = []
    completed = True
    transcript = 'Hello.'
    class Socket:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def send(self, value): sent.append(json.loads(value))
        def __aiter__(self):
            async def events():
                yield json.dumps({'type':'response.output_audio.delta', 'delta':base64.b64encode(b'\x00\x00'*2400).decode()})
                yield json.dumps({'type':'response.output_audio_transcript.done', 'transcript':transcript})
                yield json.dumps({'type':'response.done','response':{'status':'completed' if completed else 'incomplete'}})
            return events()
    monkeypatch.setattr(reading, 'connect', lambda *a, **kw: Socket())
    data = asyncio.run(reading.Provider().speech('Hello.', 'en-US'))
    with wave.open(io.BytesIO(data)) as wav:
        assert wav.getframerate() == 24000
        assert wav.getnchannels() == 1
        assert wav.getnframes() == 2400
    assert json.loads(sent[1]['item']['content'][0]['text']) == {'book_sentence': 'Hello.'}
    completed = False
    with pytest.raises(HTTPException): asyncio.run(reading.Provider().speech('Hello.', 'en-US'))
    completed = True
    transcript = 'My name is Alice.'
    with pytest.raises(HTTPException): asyncio.run(reading.Provider().speech('What is your name?', 'en-US'))


def test_private_key_file_permissions(tmp_path, monkeypatch):
    key = tmp_path / 'fixture.key'
    key.write_text('test-only-value')
    monkeypatch.setenv('PHOTO_READING_KEY_FILE', str(key))
    key.chmod(0o644)
    assert not reading.Provider().key
    key.chmod(0o600)
    assert reading.Provider().key == 'test-only-value'


def test_cancel_releases_slot_and_failure_is_not_cached(setup):
    app, _, owner = setup
    service = app.state.photo_reading
    service.provider.key = 'test'
    async def scenario():
        started = asyncio.Event()
        async def wait():
            started.set()
            await asyncio.Event().wait()
        work = asyncio.create_task(service.run(owner, 'tts', 'cancel-me', wait))
        await started.wait()
        work.cancel()
        with pytest.raises(asyncio.CancelledError):
            await work
        assert not service.active and not service.cache
        async def good(): return b'audio'
        assert await service.run(owner, 'tts', 'next', good) == b'audio'
    asyncio.run(scenario())
