#!/usr/bin/env bash

set -euo pipefail

message="${1:-}"
if [ -z "$message" ]; then
  echo "请提供中文提交说明，例如：npm run sync:up -- \"优化投资驾驶舱\""
  exit 1
fi

if ! branch="$(git symbolic-ref --quiet --short HEAD)"; then
  echo "当前不在可推送的本地分支上，已停止。"
  exit 1
fi

run_script_if_present() {
  local name="$1"
  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['${name}'] ? 0 : 1)"; then
    echo "运行 ${name}…"
    npm run "$name"
  fi
}

run_script_if_present lint
run_script_if_present build

git add -A

unsafe_files="$(git diff --cached --name-only | rg '(^|/)(\.env([^/]*))$|(^|/)[^/]*(\.pem|\.key|\.p12|\.pfx)$|(^|/)(credentials|secrets?)(\.|$)' || true)"
if [ -n "$unsafe_files" ]; then
  echo "发现可能包含密钥或环境变量的暂存文件，已停止提交："
  echo "$unsafe_files"
  echo "请检查后手动取消暂存或补充 .gitignore。"
  exit 1
fi

git diff --cached --check

if git diff --cached --quiet; then
  echo "没有需要提交的修改。"
  git pull --rebase origin "$branch"
  git push origin "$branch"
  git status --short --branch
  bash scripts/stop-dev.sh
  exit 0
fi

git commit -m "$message"
git pull --rebase origin "$branch"
git push origin "$branch"

echo "同步完成：$(git rev-parse --short HEAD) 已推送到 origin/${branch}。"
bash scripts/stop-dev.sh
