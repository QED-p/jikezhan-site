#!/usr/bin/env bash
# 发布：本地构建 -> rsync 到 releases/<时间戳> -> 原子切 symlink -> 清理旧版本 -> reload 容器
# 用法：VPS=root@qedlab.cn ./deploy/deploy.sh      （或加 SSHPASS=... 免交互；装了 SSH 密钥则无需密码）
set -euo pipefail

VPS="${VPS:-root@qedlab.cn}"
KEEP="${KEEP:-5}"
REMOTE_ROOT="${REMOTE_ROOT:-/srv/jikezhan}"
CONTAINER="${CONTAINER:-jikezhan-site}"
SSH_PORT="${SSH_PORT:-22}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"

if [ -n "${SSHPASS:-}" ]; then
  SSH_CMD=(sshpass -e ssh -p "$SSH_PORT" -o StrictHostKeyChecking=no)
  RSYNC_SSH="sshpass -e ssh -p $SSH_PORT -o StrictHostKeyChecking=no"
else
  SSH_CMD=(ssh -p "$SSH_PORT" -o StrictHostKeyChecking=no)
  RSYNC_SSH="ssh -p $SSH_PORT -o StrictHostKeyChecking=no"
fi

echo "==> 构建"
cd "$ROOT"
npm run docs:build

echo "==> 上传到 $VPS:$REMOTE_ROOT/releases/$TS"
"${SSH_CMD[@]}" "$VPS" "mkdir -p $REMOTE_ROOT/releases/$TS"
rsync -az --delete -e "$RSYNC_SSH" \
  docs/.vitepress/dist/ \
  "$VPS:$REMOTE_ROOT/releases/$TS/"

echo "==> 原子切换 symlink 并清理旧版本（保留 $KEEP 份）"
"${SSH_CMD[@]}" "$VPS" "
  set -e
  cd $REMOTE_ROOT
  ln -sfn releases/$TS current
  ls -1dt releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
  docker exec $CONTAINER nginx -s reload 2>/dev/null || true
"

echo "==> 完成: https://geekstk.com （版本 $TS）"
