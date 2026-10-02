#!/usr/bin/env bash
set -euo pipefail

VPS="${VPS:?用法: VPS=root@1.2.3.4 ./deploy/deploy.sh（可选 SSH_PORT、KEEP）}"
SSH_PORT="${SSH_PORT:-22}"
KEEP="${KEEP:-5}"
REMOTE_ROOT="${REMOTE_ROOT:-/srv/jikezhan}"
CONTAINER="${CONTAINER:-jikezhan-site}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"

echo "==> 构建"
cd "$ROOT"
npm run docs:build

echo "==> 上传到 $VPS:$REMOTE_ROOT/releases/$TS"
ssh -p "$SSH_PORT" "$VPS" "mkdir -p $REMOTE_ROOT/releases/$TS"
rsync -az --delete -e "ssh -p $SSH_PORT" \
  docs/.vitepress/dist/ \
  "$VPS:$REMOTE_ROOT/releases/$TS/"

echo "==> 原子切换 symlink 并清理旧版本（保留 $KEEP 份）"
ssh -p "$SSH_PORT" "$VPS" "
  set -e
  ln -sfn releases/$TS $REMOTE_ROOT/current
  cd $REMOTE_ROOT/releases
  ls -1dt */ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
  podman exec $CONTAINER nginx -s reload 2>/dev/null || systemctl restart $CONTAINER 2>/dev/null || true
"

echo "==> 完成: https://club.qedlab.cn （版本 $TS）"
