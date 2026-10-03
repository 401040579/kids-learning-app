"""从 Orin 拉取一致性副本到 Mac 私有目录；配置、数据库均不放静态站点。"""
import argparse
import json
import os
import re
import shlex
import sqlite3
import subprocess
import tempfile
from contextlib import closing
from pathlib import Path, PurePosixPath

BACKUP_NAME = re.compile(r'learning-\d{8}T\d{6}Z-[0-9a-f]{6}\.sqlite3')


def validate_copy(path):
    with closing(sqlite3.connect(Path(path).resolve().as_uri() + '?mode=ro', uri=True)) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('副本完整性检查失败')
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {'accounts', 'sessions', 'snapshots', 'learning_events'} <= tables:
            raise ValueError('不是完整的学习数据库副本')
        if db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0]:
            raise ValueError('副本包含会话，拒绝保存')


def load_config(path):
    path = Path(path).expanduser().resolve()
    if path.stat().st_mode & 0o077:
        raise ValueError('异机备份配置权限必须为 0600 或更严格')
    config = json.loads(path.read_text())
    if set(config) != {'host', 'service_directory', 'backup_directory', 'destination', 'keep'}:
        raise ValueError('异机备份配置字段无效')
    if not isinstance(config['host'], str) or not re.fullmatch(r'[a-zA-Z0-9_.-]+@[a-zA-Z0-9][a-zA-Z0-9_.-]*', config['host']):
        raise ValueError('SSH 主机格式无效')
    for key in ('service_directory', 'backup_directory'):
        value = config[key]
        if not isinstance(value, str) or not value.startswith('/') or '\n' in value or '..' in PurePosixPath(value).parts:
            raise ValueError('远端目录必须是绝对路径')
    if type(config['keep']) is not int or not 1 <= config['keep'] <= 90:
        raise ValueError('保留份数应为 1–90')
    destination = Path(config['destination']).expanduser().resolve()
    project = Path(__file__).resolve().parent.parent
    if destination == Path.home() or destination == Path('/') or destination.is_relative_to(project):
        raise ValueError('本机副本必须保存到项目之外的独立私有目录')
    config['destination'] = destination
    return config


def pull_backup(config, runner=subprocess.run):
    destination = config['destination']
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(destination, 0o700)
    # 远端 Backup API 在服务运行时产生一致性且不含会话的副本，不复制活跃 WAL 文件。
    command = 'cd ' + shlex.quote(config['service_directory']) + ' && .venv/bin/python -m backend.backup --directory ' + shlex.quote(config['backup_directory'])
    ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2']
    result = runner([*ssh, config['host'], command], capture_output=True, text=True, check=True, timeout=90)
    remote = PurePosixPath(result.stdout.strip())
    if str(remote.parent) != config['backup_directory'].rstrip('/') or not BACKUP_NAME.fullmatch(remote.name):
        raise ValueError('远端未返回预期备份文件，旧副本保留')
    target = destination / remote.name
    fd, temporary = tempfile.mkstemp(prefix='.pull-', dir=destination)
    os.close(fd)
    try:
        runner(['scp', '-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', config['host'] + ':' + str(remote), temporary], capture_output=True, text=True, check=True, timeout=90)
        validate_copy(temporary)
        os.chmod(temporary, 0o600)
        os.replace(temporary, target)
        backups = sorted((p for p in destination.iterdir() if BACKUP_NAME.fullmatch(p.name)), key=lambda p: (p.stat().st_mtime_ns, p.name))
        for old in backups[:-config['keep']]:
            old.unlink()
        return target
    finally:
        Path(temporary).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description='拉取 Orin 私有学习副本，成功校验后才清理本机旧副本')
    parser.add_argument('--config', default='~/.config/kids-learning/offsite.json')
    args = parser.parse_args()
    try:
        target = pull_backup(load_config(args.config))
        print('异机备份成功：' + str(target))
    except (OSError, ValueError, sqlite3.Error, subprocess.SubprocessError) as error:
        # 不输出子进程 stdout/stderr，避免将实际配置或数据写入通用日志。
        parser.exit(1, '异机备份失败，已有副本保留：' + type(error).__name__ + '\n')


if __name__ == '__main__':
    main()
