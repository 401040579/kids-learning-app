"""SQLite 在线一致性备份；备份和数据库都不能放到静态网站目录。"""
import argparse
import os
import secrets
import sqlite3
import tempfile
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from backend.service import Settings


def backup_database(source, directory, keep=14):
    source, directory = Path(source).resolve(), Path(directory).expanduser().resolve()
    project = Path(__file__).resolve().parent.parent
    if directory.is_relative_to(project) or source.is_relative_to(directory):
        raise ValueError("备份必须位于项目目录外的独立私有目录")
    if not source.is_file() or keep < 1:
        raise ValueError("数据库不存在或保留份数无效")
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(directory, 0o700)
    filename = f"learning-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}-{secrets.token_hex(3)}.sqlite3"
    target = directory / filename
    fd, temporary = tempfile.mkstemp(prefix='.backup-', dir=directory)
    os.close(fd)
    try:
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as original, closing(sqlite3.connect(temporary)) as copy:
            original.backup(copy, pages=128, sleep=0.05)
            # 恢复后必须重新登录，备份不携带有效会话。
            copy.execute("DELETE FROM sessions")
            copy.commit()
            # Backup API 会继承 WAL 模式；独立副本必须收敛到单文件再改名。
            copy.execute("PRAGMA journal_mode=DELETE")
            if copy.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("备份完整性检查失败")
        os.chmod(temporary, 0o600)
        os.replace(temporary, target)
        # 只清理本工具命名的历史副本，保留恢复前人工备份等其他文件。
        import re
        backups = sorted((path for path in directory.iterdir() if path != target and re.fullmatch(r"learning-\d{8}T\d{6}Z-[0-9a-f]{6}\.sqlite3", path.name)), key=lambda path: (path.stat().st_mtime_ns, path.name))
        for path in backups[:max(0, len(backups) - keep + 1)]:
            path.unlink()
        return target
    finally:
        Path(temporary).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description="生成经过完整性检查、撤销会话的私有在线备份")
    parser.add_argument('--directory', default='~/.local/share/kids-learning-backups')
    parser.add_argument('--keep', type=int, default=14)
    args = parser.parse_args()
    try:
        print(backup_database(Settings.environment().database, args.directory, args.keep))
    except (ValueError, sqlite3.Error, OSError) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
