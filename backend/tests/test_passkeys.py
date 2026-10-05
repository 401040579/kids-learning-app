"""Real ES256 signatures / CBOR attestations, no production credentials or mocked crypto."""
import hashlib
import json
import secrets
import sqlite3
import time

import cbor2
import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from webauthn.helpers import bytes_to_base64url as b64, base64url_to_bytes as unb64

from backend.backup import backup_database
from backend.service import create_app, Settings
from backend.tests.test_accounts import ORIGIN, PASSWORD, client, login


class Authenticator:
    def __init__(self, owner):
        self.owner = owner
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.id = secrets.token_bytes(32)

    def response(self, options, *, registration=False, origin=ORIGIN, rp='app.tao.irish',
                 flags=0x1d, count=0, handle=None):
        client_data = json.dumps({'type': 'webauthn.create' if registration else 'webauthn.get',
                                 'challenge': options['challenge'], 'origin': origin, 'crossOrigin': False}).encode()
        data = hashlib.sha256(rp.encode()).digest() + bytes([flags | (0x40 if registration else 0)]) + count.to_bytes(4, 'big')
        if registration:
            n = self.key.public_key().public_numbers()
            cose = cbor2.dumps({1: 2, 3: -7, -1: 1, -2: n.x.to_bytes(32, 'big'), -3: n.y.to_bytes(32, 'big')})
            data += bytes(16) + len(self.id).to_bytes(2, 'big') + self.id + cose
            response = {'attestationObject': b64(cbor2.dumps({'fmt': 'none', 'authData': data, 'attStmt': {}})),
                        'clientDataJSON': b64(client_data), 'transports': ['internal', 'hybrid']}
        else:
            response = {'authenticatorData': b64(data), 'clientDataJSON': b64(client_data),
                        'signature': b64(self.key.sign(data + hashlib.sha256(client_data).digest(), ec.ECDSA(hashes.SHA256()))),
                        'userHandle': b64((handle or self.owner).encode())}
        return {'id': b64(self.id), 'rawId': b64(self.id), 'type': 'public-key', 'response': response}


@pytest.fixture
def setup(tmp_path):
    app = create_app(Settings(tmp_path / 'private.sqlite3', (ORIGIN,)))
    owner = app.state.store.create_account('iris', 'Iris', PASSWORD)
    browser = client(app)
    login(browser)
    return app, browser, Authenticator(owner)


def enrol(browser, authenticator):
    options = browser.post('/api/passkeys/register/options', json={'password': PASSWORD, 'label': 'Iris 的 iPad'})
    assert options.status_code == 200, options.text
    assert options.json()['rp']['id'] == 'app.tao.irish'
    assert options.json()['authenticatorSelection']['userVerification'] == 'required'
    assert options.json()['authenticatorSelection']['residentKey'] == 'required'
    result = browser.post('/api/passkeys/register/verify', json={'credential': authenticator.response(options.json(), registration=True)})
    assert result.status_code == 200, result.text
    return result.json()['id']


def assert_login(browser, authenticator, **kwargs):
    options = browser.post('/api/passkeys/login/options')
    assert options.status_code == 200, options.text
    credential = authenticator.response(options.json(), **kwargs)
    response = browser.post('/api/passkeys/login/verify', json={'credential': credential})
    if response.status_code == 200:
        browser.headers['X-CSRF-Token'] = response.json()['csrf']
    return response, credential


def test_real_passkey_login_and_synced_zero_counters(setup):
    app, parent, auth = setup
    enrol(parent, auth)
    device = client(app)
    for _ in range(2):
        result, _ = assert_login(device, auth)
        assert result.status_code == 200, result.text
        assert result.json()['id'] == auth.owner
        assert 'HttpOnly' in result.headers['set-cookie'] and 'Secure' in result.headers['set-cookie']
        assert device.get('/api/account').json()['id'] == auth.owner
    view = device.get('/api/security').json()
    assert view['passkeys'][0]['backed_up'] == 1
    assert view['passkeys'][0]['last_used'] is not None
    assert any(s['current'] and s['method'] == 'passkey' for s in view['sessions'])
    assert not any('public_key' in k or 'credential_id' in k for k in view['passkeys'])


@pytest.mark.parametrize('change', ['origin', 'rp', 'uv', 'challenge', 'signature', 'handle'])
def test_invalid_authentication_is_rejected_and_challenge_consumed(setup, change):
    app, parent, auth = setup
    enrol(parent, auth)
    device = client(app)
    opts = device.post('/api/passkeys/login/options').json()
    kwargs = {'origin': 'https://evil.example'} if change == 'origin' else {'rp': 'evil.example'} if change == 'rp' else {'flags': 0x19} if change == 'uv' else {'handle': 'another-account'} if change == 'handle' else {}
    if change == 'challenge':
        opts['challenge'] = b64(secrets.token_bytes(32))
    credential = auth.response(opts, **kwargs)
    if change == 'signature':
        credential['response']['signature'] = b64(b'invalid')
    response = device.post('/api/passkeys/login/verify', json={'credential': credential})
    assert response.status_code == 400, response.text
    assert device.get('/api/account').status_code == 401
    assert device.post('/api/passkeys/login/verify', json={'credential': credential}).status_code == 400


@pytest.mark.parametrize('change', ['origin', 'uv', 'rp'])
def test_invalid_registration_keeps_no_key(setup, change):
    app, parent, auth = setup
    opts = parent.post('/api/passkeys/register/options', json={'password': PASSWORD, 'label': 'Test'}).json()
    kwargs = {'origin': 'https://evil.example'} if change == 'origin' else {'rp': 'evil.example'} if change == 'rp' else {'flags': 0x19}
    response = parent.post('/api/passkeys/register/verify', json={'credential': auth.response(opts, registration=True, **kwargs)})
    assert response.status_code == 400, response.text
    assert parent.get('/api/security').json()['passkeys'] == []


def test_enrol_requires_session_csrf_and_password(setup):
    app, browser, auth = setup
    body = {'password': PASSWORD, 'label': 'iPad'}
    assert client(app).post('/api/passkeys/register/options', json=body).status_code == 401
    assert browser.post('/api/passkeys/register/options', json=body, headers={'X-CSRF-Token': 'wrong'}).status_code == 403
    assert browser.post('/api/passkeys/register/options', json={**body, 'password': 'wrong'}).status_code == 403
    assert browser.post('/api/passkeys/register/options', json=body, headers={'Origin': 'https://evil.example'}).status_code == 403


def test_challenge_cookie_binding_expiry_and_replay(setup):
    app, parent, auth = setup
    enrol(parent, auth)
    one, two = client(app), client(app)
    opts = one.post('/api/passkeys/login/options').json()
    payload = {'credential': auth.response(opts)}
    assert two.post('/api/passkeys/login/verify', json=payload).status_code == 400
    assert one.post('/api/passkeys/login/verify', json=payload).status_code == 200
    assert one.post('/api/passkeys/login/verify', json=payload).status_code == 400
    opts = two.post('/api/passkeys/login/options').json()
    with app.state.store.connection() as db:
        db.execute('UPDATE passkey_challenges SET expires=?', (int(time.time()) - 1,))
    assert two.post('/api/passkeys/login/verify', json={'credential': auth.response(opts)}).status_code == 400


def test_reset_during_registration_and_key_deletion_during_login(setup, monkeypatch):
    app, parent, auth = setup
    opts = parent.post('/api/passkeys/register/options', json={'password': PASSWORD, 'label': 'iPad'}).json()
    app.state.store.administer('iris', password=PASSWORD)
    assert parent.post('/api/passkeys/register/verify', json={'credential': auth.response(opts, registration=True)}).status_code == 401
    login(parent)
    key = enrol(parent, auth)
    import backend.passkeys as pk
    original = pk.verify_authentication_response
    def verify_then_remove(**kwargs):
        result = original(**kwargs)
        assert parent.post('/api/passkeys/remove', json={'id': key}).status_code == 200
        return result
    monkeypatch.setattr(pk, 'verify_authentication_response', verify_then_remove)
    assert assert_login(client(app), auth)[0].status_code == 401


def test_remove_key_revokes_its_sessions_and_blocks_login(setup):
    app, parent, auth = setup
    key = enrol(parent, auth)
    device = client(app)
    assert assert_login(device, auth)[0].status_code == 200
    assert parent.post('/api/passkeys/remove', json={'id': key}).json()['revoked_current'] is False
    assert device.get('/api/account').status_code == 401
    assert parent.get('/api/account').status_code == 200
    assert assert_login(client(app), auth)[0].status_code == 401


def test_session_revoke_scope_csrf_and_current_logout(setup):
    app, parent, auth = setup
    device = client(app)
    login(device)
    app.state.store.create_account('other', 'Other', PASSWORD)
    other = client(app)
    login(other, name='other')
    target = next(s['id'] for s in device.get('/api/security').json()['sessions'] if s['current'])
    assert other.post('/api/sessions/revoke', json={'id': target}).status_code == 404
    assert parent.post('/api/sessions/revoke', json={'id': target}, headers={'X-CSRF-Token': 'wrong'}).status_code == 403
    assert parent.post('/api/sessions/revoke', json={'id': target}).status_code == 200
    assert device.get('/api/account').status_code == 401
    assert other.get('/api/account').status_code == 200
    current = next(s['id'] for s in parent.get('/api/security').json()['sessions'] if s['current'])
    result = parent.post('/api/sessions/revoke', json={'id': current})
    assert result.json()['revoked_current'] is True
    assert parent.get('/api/account').status_code == 401


def test_revoke_others_and_admin_recovery(setup):
    app, parent, auth = setup
    enrol(parent, auth)
    device = client(app)
    assert assert_login(device, auth)[0].status_code == 200
    assert parent.post('/api/sessions/revoke-others', json={}).status_code == 200
    assert device.get('/api/account').status_code == 401
    assert parent.get('/api/account').status_code == 200
    app.state.store.administer('iris', password=PASSWORD)
    assert parent.get('/api/account').status_code == 401
    assert assert_login(client(app), auth)[0].status_code == 401


def test_backup_keeps_public_key_but_drops_ceremonies_and_sessions(setup, tmp_path):
    app, parent, auth = setup
    enrol(parent, auth)
    parent.post('/api/passkeys/login/options')
    copy = backup_database(app.state.store.path, tmp_path / 'backups')
    with sqlite3.connect(copy) as db:
        assert db.execute('SELECT count(*) FROM passkeys').fetchone()[0] == 1
        for table in ['sessions', 'session_details', 'passkey_challenges']:
            assert db.execute(f'SELECT count(*) FROM {table}').fetchone()[0] == 0
    assert parent.get('/api/account').status_code == 200


def test_legacy_sessions_remain_valid_and_key_limit(setup):
    app, parent, auth = setup
    with app.state.store.connection() as db:
        db.execute('DELETE FROM session_details')
    assert parent.get('/api/security').json()['sessions'][0]['method'] == 'legacy'
    key = enrol(parent, auth)
    with app.state.store.connection() as db:
        row = list(db.execute('SELECT * FROM passkeys WHERE id=?', (key,)).fetchone())
        for i in range(7):
            row[0], row[2] = secrets.token_hex(16), b64(secrets.token_bytes(32))
            db.execute('INSERT INTO passkeys VALUES (?,?,?,?,?,?,?,?,?,?)', row)
    assert parent.post('/api/passkeys/register/options', json={'password': PASSWORD, 'label': 'Ninth'}).status_code == 409


def test_monotonic_single_device_counter_cannot_be_reused(setup):
    app, parent, auth = setup
    enrol(parent, auth)
    browser = client(app)
    assert assert_login(browser, auth, flags=0x05, count=2)[0].status_code == 200
    assert assert_login(browser, auth, flags=0x05, count=2)[0].status_code == 400


def test_key_cannot_be_enrolled_into_another_account(setup):
    app, parent, auth = setup
    enrol(parent, auth)
    app.state.store.create_account('other', 'Other', PASSWORD)
    other = client(app); login(other, name='other')
    options = other.post('/api/passkeys/register/options', json={'password': PASSWORD, 'label': 'Other'}).json()
    response = other.post('/api/passkeys/register/verify', json={'credential': auth.response(options, registration=True)})
    assert response.status_code == 409
    assert other.get('/api/security').json()['passkeys'] == []


def test_registration_cookie_cannot_move_to_another_logged_in_browser(setup):
    app, parent, auth = setup
    options = parent.post('/api/passkeys/register/options', json={'password': PASSWORD, 'label': 'iPad'}).json()
    other_device = client(app);login(other_device)
    other_device.cookies.set('__Host-kids_passkey', parent.cookies.get('__Host-kids_passkey'))
    result = other_device.post('/api/passkeys/register/verify', json={'credential': auth.response(options, registration=True)})
    assert result.status_code == 403
    assert parent.get('/api/security').json()['passkeys'] == []
