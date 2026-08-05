#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

acquire_lock() {
  local git_dir lock_file

  git_dir=$(git -C "$REPO_ROOT" rev-parse --git-dir)
  if [[ "$git_dir" != /* ]]; then
    git_dir="$REPO_ROOT/$git_dir"
  fi

  lock_file="$git_dir/vscode-auto-sync.lock"
  exec 9>"$lock_file"
  if ! flock -n 9; then
    log "已有一个自动同步任务正在运行，本次跳过。"
    exit 0
  fi
}

ensure_git_is_idle() {
  local state state_path

  for state in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
    state_path=$(git -C "$REPO_ROOT" rev-parse --git-path "$state")
    if [[ -e "$state_path" ]]; then
      echo "错误：仓库正在执行合并、变基或拣选操作，已停止自动同步。" >&2
      return 1
    fi
  done
}

usage() {
  cat <<'EOF'
用法：
  ./scripts/vscode-auto-sync.sh --sync-only
      立即提交并同步当前改动。

  ./scripts/vscode-auto-sync.sh --help
      显示帮助。
EOF
}

sync_repository() {
  local branch timestamp

  acquire_lock
  ensure_git_is_idle

  branch=$(git -C "$REPO_ROOT" branch --show-current)
  if [[ -z "$branch" ]]; then
    echo "错误：当前仓库处于 detached HEAD，已停止自动同步。" >&2
    return 1
  fi

  git -C "$REPO_ROOT" add -A

  if ! git -C "$REPO_ROOT" diff --cached --quiet; then
    git -C "$REPO_ROOT" diff --cached --check
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    git -C "$REPO_ROOT" commit -m "自动同步：$timestamp"
  else
    log "没有需要提交的文件。"
  fi

  log "正在从 origin/$branch 拉取并变基……"
  git -C "$REPO_ROOT" pull --rebase origin "$branch"

  log "正在推送到 origin/$branch……"
  git -C "$REPO_ROOT" push origin "$branch"
  log "自动同步完成。"
}

case "${1:-}" in
  --sync-only)
    sync_repository
    ;;
  --help|-h)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
