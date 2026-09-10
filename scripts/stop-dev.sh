#!/usr/bin/env bash

set -euo pipefail

state_dir=".work"
pid_file="${state_dir}/dev.pid"

if [ ! -f "$pid_file" ]; then
  exit 0
fi

pid="$(cat "$pid_file")"
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "已停止本次工作启动的本地开发服务（PID ${pid}）。"
fi
rm -f "$pid_file"
