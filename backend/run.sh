#!/bin/sh
# 独立进程、独立锁，不能使用 brain_proxy 的重启/控制命令。
set -eu
umask 077
cd "$(dirname "$0")/.."
data_dir="$HOME/.local/share/kids-learning"
mkdir -p "$data_dir"
exec 9>"$data_dir/service.lock"
flock -n 9 || exit 0
exec .venv/bin/python -m uvicorn backend.service:create_app --factory \
  --host 127.0.0.1 --port 8091 --workers 1 --no-access-log \
  >> "$data_dir/service.log" 2>&1
