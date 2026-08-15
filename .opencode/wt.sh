#!/usr/bin/env bash
# wt.sh — git-worktree orchestration helper for the swarm setup.
# Used by the orchestrator agent and manually. NEVER runs destructive ops
# on the main tree's uncommitted files.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
WT_DIR="$ROOT/.worktrees"
BASE="$(git symbolic-ref --short -q HEAD || echo main)"

cmd="${1:-}"
name="${2:-}"

usage() {
  echo "usage: wt.sh {create|status|merge|cleanup} <name>"
  exit 1
}

[ -n "$cmd" ] && [ -n "$name" ] || [ "$cmd" = "list" ] || usage

case "$cmd" in
  create)
    git worktree list --porcelain | grep -q " $WT_DIR/$name\$" && {
      echo "WORKTREE EXISTS: $name"
      exit 1
    }
    git worktree add "$WT_DIR/$name" -b "wt/$name" "$BASE" >/dev/null
    ln -sfn "$ROOT/node_modules" "$WT_DIR/$name/node_modules"
    [ -f "$ROOT/.env" ] && ln -sfn "$ROOT/.env" "$WT_DIR/$name/.env"
    echo "$WT_DIR/$name"
    ;;
  status)
    git -C "$WT_DIR/$name" status --porcelain
    ;;
  merge)
    wt="$WT_DIR/$name"
    [ -d "$wt" ] || { echo "NO WORKTREE: $name (create first)"; exit 3; }
    dirty="$(git -C "$wt" status --porcelain --untracked-files=no)"
    [ -z "$dirty" ] || { echo "DIRTY WORKTREE: $dirty"; exit 2; }
    [ "$(git rev-parse HEAD)" = "$(git rev-parse "wt/$name")" ] && {
      git worktree remove --force "$wt"
      git branch -D "wt/$name" >/dev/null
      echo "NOOP:$name"
      exit 0
    }
    git switch "$BASE" >/dev/null
    if git merge --no-ff "wt/$name" -m "merge: $name" >/dev/null 2>&1; then
      git worktree remove --force "$wt"
      echo "MERGED:$name"
      exit 0
    fi
    echo "CONFLICT:$name"
    git status --porcelain | grep -E '^(AA|DD|UU|AU|UA|DU|UD)' || true
    exit 4
    ;;
  cleanup)
    git worktree remove --force "$WT_DIR/$name" 2>/dev/null || true
    git branch -D "wt/$name" 2>/dev/null || true
    echo "CLEANED:$name"
    ;;
  list)
    git worktree list
    ;;
  *)
    usage
    ;;
esac
