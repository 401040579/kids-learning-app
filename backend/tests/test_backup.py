import os
import sqlite3

import pytest

from backend.backup import backup_database
from backend.service import Store


def test_online_backup_preserves_learning_and_excludes_active_sessions(tmp_path):
    store = Store(tmp_path / 'private' / 'learning.sqlite3')
    owner = store.create_account('iris', 'Iris', 'test-only-password-123456')
    store.login('iris', 'test-only-password-123456', None)
    # 在启用 WAL、有连接仍打开时生成副本，不能使用普通文件复制。
    with store.connection() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('INSERT INTO snapshots VALUES (?,?,?,?)', (owner, 3, 123, '{}'))
        db.commit()
        path = backup_database(store.path, tmp_path / 'backups')
    with sqlite3.connect(path) as restored:
        assert restored.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert restored.execute('SELECT revision FROM snapshots').fetchone()[0] == 3
        assert restored.execute('SELECT count(*) FROM accounts').fetchone()[0] == 1
        assert restored.execute('SELECT count(*) FROM sessions').fetchone()[0] == 0
    with store.connection() as db:
        assert db.execute('SELECT count(*) FROM sessions').fetchone()[0] == 1
    assert os.stat(path).st_mode & 0o777 == 0o600
    assert os.stat(path.parent).st_mode & 0o777 == 0o700


def test_backup_retention_only_removes_generated_copies(tmp_path):
    store = Store(tmp_path / 'private.sqlite3')
    directory = tmp_path / 'backups'
    directory.mkdir()
    manual = directory / 'before-restore.sqlite3'
    manual.write_text('keep this')
    for _ in range(3):
        backup_database(store.path, directory, keep=2)
    assert len(list(directory.glob('learning-*.sqlite3'))) == 2
    assert manual.read_text() == 'keep this'
    with pytest.raises(ValueError):
        backup_database(store.path, tmp_path)


def test_backup_cannot_be_written_into_static_project(tmp_path):
    store = Store(tmp_path / 'private.sqlite3')
    from pathlib import Path
    with pytest.raises(ValueError, match='项目目录外'):
        backup_database(store.path, Path(__file__).parent / 'unsafe')
