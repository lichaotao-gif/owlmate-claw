#!/usr/bin/env bash

set -euo pipefail

if ! branch="$(git symbolic-ref --quiet --short HEAD)"; then
  echo "当前不在可同步的本地分支上，已停止。"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "检测到未提交修改，已停止同步。请先处理本地改动，避免覆盖。"
  git status --short
  exit 1
fi

echo "当前分支：${branch}；工作区干净，正在拉取更新…"
git pull --ff-only origin "$branch"
