#!/usr/bin/env bash
# 服务器一次性初始化（幂等）：发布目录 + 容器配置 + Docker 容器
# 用法：VPS=root@qedlab.cn ./deploy/setup-server.sh   （或加 SSHPASS=... 免交互）
set -euo pipefail

VPS="${VPS:?用法: VPS=root@qedlab.cn [SSHPASS=...] ./deploy/setup-server.sh}"
ROOT="${REMOTE_ROOT:-/srv/jikezhan}"
CONTAINER="${CONTAINER:-jikezhan-site}"
PORT="${PORT:-8080}"
SSH_PORT="${SSH_PORT:-22}"

HERE="$(cd "$(dirname "$0")" && pwd)"
COMMON_OPTS=(-p "$SSH_PORT" -o StrictHostKeyChecking=no)

if [ -n "${SSHPASS:-}" ]; then
  SSH_CMD=(sshpass -e ssh "${COMMON_OPTS[@]}")
  SCP_CMD=(sshpass -e scp -P "$SSH_PORT" -o StrictHostKeyChecking=no)
else
  SSH_CMD=(ssh "${COMMON_OPTS[@]}")
  SCP_CMD=(scp -P "$SSH_PORT" -o StrictHostKeyChecking=no)
fi

echo "==> 建目录并上传容器配置"
"${SSH_CMD[@]}" "$VPS" "mkdir -p $ROOT/releases"
"${SCP_CMD[@]}" "$HERE/nginx.container.conf" "$VPS:$ROOT/nginx.conf"

echo "==> 启容器（127.0.0.1:$PORT -> 80，只读挂载发布根）"
"${SSH_CMD[@]}" "$VPS" "
  set -e
  if ! docker inspect $CONTAINER >/dev/null 2>&1; then
    docker run -d --name $CONTAINER --restart=always \
      -p 127.0.0.1:$PORT:80 \
      -v $ROOT:/srv:ro \
      -v $ROOT/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
      docker.io/library/nginx:alpine
  else
    docker restart $CONTAINER >/dev/null
  fi
  docker exec $CONTAINER nginx -t
"
echo "==> 容器就绪：http://127.0.0.1:$PORT"
