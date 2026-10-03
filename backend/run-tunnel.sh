#!/bin/sh
# 学习 API 的用户级隧道；与 API/机器人大脑各自独立，不需要 sudo。
set -eu
umask 077
data_dir="$HOME/.local/share/kids-learning"
config_file="$data_dir/tunnel/config.yml"
binary="$HOME/.local/bin/cloudflared"
mkdir -p "$data_dir"
[ -r "$config_file" ] || exit 1
[ -x "$binary" ] || exit 1
exec 9>"$data_dir/tunnel.lock"
flock -n 9 || exit 0
exec "$binary" tunnel --config "$config_file" --no-autoupdate run \
  >> "$data_dir/tunnel.log" 2>&1
