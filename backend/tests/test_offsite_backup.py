import json
import os
import shutil
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest

from scripts.offsite_backup import load_config, pull_backup, validate_copy


def copy_db(path, sessions=False):
    with sqlite3.connect(path) as db:
        for name in ('accounts', 'sessions', 'snapshots', 'learning_events'):
            db.execute(f'CREATE TABLE {name}(id TEXT)')
        if sessions:
            db.execute("INSERT INTO sessions VALUES ('token')")


def config(directory):
    return dict(host='tester@orin', service_directory='/home/tester/service', backup_directory='/home/tester/backups', destination=directory, keep=2)


def test_pull_is_atomic_validated_private_and_preserves_unrelated_files(tmp_path):
    source = tmp_path / 'source.sqlite3'; copy_db(source)
    destination = tmp_path / 'private'; destination.mkdir()
    unrelated = destination / 'manual.sqlite3'; unrelated.write_text('preserve')
    for day in (1, 2):
        old = destination / f'learning-2026100{day}T000000Z-abcdef.sqlite3'; old.write_text('old')
        os.utime(old, (day, day))
    def runner(args, **kwargs):
        if args[0] == 'ssh':
            return SimpleNamespace(stdout='/home/tester/backups/learning-20261003T000000Z-abcdef.sqlite3\n')
        shutil.copyfile(source, args[-1]); return SimpleNamespace(stdout='')
    target = pull_backup(config(destination), runner)
    validate_copy(target)
    assert target.stat().st_mode & 0o777 == 0o600
    assert destination.stat().st_mode & 0o777 == 0o700
    assert len(list(destination.glob('learning-*'))) == 2
    assert unrelated.read_text() == 'preserve'


@pytest.mark.parametrize('bad', ['wrong-path', 'corrupt', 'sessions'])
def test_failed_pull_keeps_existing_backups(tmp_path, bad):
    destination = tmp_path / 'private'; destination.mkdir()
    old = destination / 'learning-20261001T000000Z-abcdef.sqlite3'; old.write_text('old')
    source = tmp_path / 'source.sqlite3'; copy_db(source, sessions=bad == 'sessions')
    def runner(args, **kwargs):
        if args[0] == 'ssh':
            return SimpleNamespace(stdout='/etc/passwords' if bad == 'wrong-path' else '/home/tester/backups/learning-20261003T000000Z-abcdef.sqlite3')
        if bad == 'corrupt': Path(args[-1]).write_text('bad')
        else: shutil.copyfile(source, args[-1])
        return SimpleNamespace(stdout='')
    with pytest.raises((ValueError, sqlite3.Error)):
        pull_backup(config(destination), runner)
    assert old.read_text() == 'old'
    assert not list(destination.glob('.pull-*'))


def test_private_config_rejects_ssh_options_and_static_destination(tmp_path):
    path = tmp_path / 'config.json'
    settings = config(str(tmp_path / 'private'))
    path.write_text(json.dumps(settings)); path.chmod(0o644)
    with pytest.raises(ValueError): load_config(path)
    path.chmod(0o600)
    assert load_config(path)['host'] == 'tester@orin'
    settings['host'] = '-oProxyCommand=evil'
    path.write_text(json.dumps(settings))
    with pytest.raises(ValueError): load_config(path)
    settings['host'] = 'tester@orin'; settings['destination'] = str(Path(__file__).resolve().parents[2] / 'data')
    path.write_text(json.dumps(settings))
    with pytest.raises(ValueError): load_config(path)
