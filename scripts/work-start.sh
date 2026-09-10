#!/usr/bin/env bash

set -euo pipefail

bash scripts/sync-down.sh

if [ ! -d node_modules ]; then
  echo "未检测到依赖，使用 pnpm-lock.yaml 安装锁定版本…"
  pnpm install --frozen-lockfile
else
  echo "依赖目录已存在，跳过安装。"
fi

state_dir=".work"
pid_file="${state_dir}/dev.pid"
log_file="${state_dir}/dev.log"
mkdir -p "$state_dir"

if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
  echo "本地开发服务已在运行（PID $(cat "$pid_file")）。"
else
  rm -f "$pid_file"
  echo "正在启动本地开发服务…"
  nohup npm run dev -- --host 127.0.0.1 --port 3018 < /dev/null >"$log_file" 2>&1 &
  echo $! >"$pid_file"
fi

preview_url="http://localhost:3018"
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error "$preview_url" >/dev/null; then
    if command -v open >/dev/null 2>&1; then
      open "$preview_url"
    fi
    echo "本地预览已启动：首页可访问。"
    echo "预览地址：${preview_url}"
    echo "开发服务会保持运行；完成后请使用“结束工作”。"
    exit 0
  fi
  sleep 1
done

echo "开发服务未能在 30 秒内响应。请查看 ${log_file}。"
exit 1
