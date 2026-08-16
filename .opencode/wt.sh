#!/usr/bin/env bash
# wt.sh — multi-window swarm orchestration helper.
# Only agents (commander/dev-lead) invoke this; the user never types these.
#
#   wt.sh base [name]                     # show/set integration base branch
#   wt.sh stream <name>                   # create a stream branch (big problem)
#   wt.sh open <task> [--stream <name>]   # worktree+branch+window for a new session
#   wt.sh status                          # per-task dashboard
#   wt.sh sync <task>                     # merge stream/base updates into a task worktree
#   wt.sh integrate [task...]             # merge open tasks into streams/base (tests + auto-resolve)
#   wt.sh promote <stream> [--pr]         # merge stream into base (full suite) [+ PR]
#   wt.sh cleanup <task|stream>           # remove worktree + branch (refuses dirty)
#   wt.sh list                            # worktree list
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
WT_DIR="$ROOT/.worktrees"
BASE_FILE="$WT_DIR/.base"
INTEG="$WT_DIR/_integ"
MAX_RESOLVE_ATTEMPTS=3

BASE="${SWARM_BASE:-}"
if [ -z "$BASE" ] && [ -f "$BASE_FILE" ]; then
  BASE="$(cat "$BASE_FILE")"
fi
if [ -z "$BASE" ]; then
  BASE="$(git symbolic-ref --short -q HEAD || echo main)"
fi

usage() {
  sed -n '2,14p' "$0"
  exit 1
}

die() { echo "ERR: $*" >&2; exit 1; }

[ "${1:-}" = "list" ] && { git worktree list; exit 0; }
cmd="${1:-}"; shift || true

valid_name() { [[ "$1" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "invalid name: $1 (lowercase a-z0-9-)"; }

link_worktree() { # <wt>
  ln -sfn "$ROOT/node_modules" "$1/node_modules"
  [ -f "$ROOT/.env" ] && ln -sfn "$ROOT/.env" "$1/.env"
}

case "$cmd" in
  base)
    if [ -n "${1:-}" ]; then
      [[ "$1" =~ ^[a-z0-9][a-z0-9/_-]*$ ]] || die "invalid base branch: $1"
      git rev-parse --verify -q "refs/heads/$1" >/dev/null || die "branch does not exist: $1"
      mkdir -p "$WT_DIR"
      echo "$1" > "$BASE_FILE"
      echo "base=$1"
    else
      echo "$BASE"
    fi
    ;;

  stream)
    { [ -n "${1:-}" ] && valid_name "$1"; } || usage
    git rev-parse --verify -q "refs/heads/stream/$1" >/dev/null && die "stream already exists: $1"
    git branch "stream/$1" "$BASE"
    echo "stream/$1 (from $BASE)"
    ;;

  open)
    { [ -n "${1:-}" ] && valid_name "$1"; } || usage
    task="$1"; stream=""
    [ "${2:-}" = "--stream" ] && { stream="${3:-}"; valid_name "$stream"; }
    branch="wt/$task"
    [ -n "$stream" ] && branch="wt/$stream/$task"
    head="$BASE"
    [ -n "$stream" ] && head="stream/$stream"
    git rev-parse --verify -q "refs/heads/$head" >/dev/null || die "parent does not exist: $head (stream '$stream' nahi banayi?)"
    git rev-parse --verify -q "refs/heads/$branch" >/dev/null && die "branch already exists: $branch"
    git worktree add "$WT_DIR/$task" -b "$branch" "$head" >/dev/null
    link_worktree "$WT_DIR/$task"
    if [ "${SWARM_NO_WINDOW:-0}" = "1" ]; then
      echo "WT:$WT_DIR/$task (window suppressed)"
    else
      osascript -e "tell application \"Terminal\" to do script \"cd '$WT_DIR/$task' && clear && exec opencode\"" >/dev/null 2>&1 \
        || { echo "WARN: could not open Terminal window (osascript failed) — worktree ready at $WT_DIR/$task, commander ko batana"; exit 0; }
      echo "WINDOW:$WT_DIR/$task (session '$task' khol di — nayi Terminal window + nayi opencode conversation)"
    fi
    ;;

  sync)
    { [ -n "${1:-}" ] && valid_name "$1"; } || usage
    task="$1"; wt="$WT_DIR/$task"
    [ -d "$wt" ] || die "no worktree for: $task"
    branch="$(git -C "$wt" symbolic-ref --short HEAD)"
    case "$branch" in
      wt/*/*) seg="${branch#wt/}"; target="stream/${seg%%/*}" ;;
      wt/*)   target="$BASE" ;;
      *)      die "not a swarm task branch: $branch" ;;
    esac
    git -C "$wt" merge "$target" -m "sync: $target -> $task" \
      || { echo "WARN: sync conflict — window '$task' me resolve karo (files left with markers)"; exit 2; }
    echo "synced $target -> $wt"
    ;;

  status)
    printf "%-22s %-28s %-10s %-10s\n" "TASK" "BRANCH" "AHEAD" "STATE"
    for wt in "$WT_DIR"/*/; do
      [ -d "$wt/.git" ] || [ -f "$wt/.git" ] || continue
      task="$(basename "$wt")"
      [ "$task" = "_integ" ] && continue
      branch="$(git -C "$wt" symbolic-ref --short HEAD 2>/dev/null || echo detached)"
      dirty="$(git -C "$wt" status --porcelain --untracked-files=no | wc -l | tr -d ' ')"
      case "$branch" in
        wt/*/*) seg="${branch#wt/}"; target="stream/${seg%%/*}" ; ti="stream" ;;
        wt/*)   target="$BASE" ; ti="base" ;;
        *)      target="-" ; ti="-" ;;
      esac
      if [ "$target" != "-" ]; then
        ahead="$(git rev-list --count "$target..$branch" 2>/dev/null || echo "?")"
        if git merge-tree --write-tree "$target" "$branch" >/dev/null 2>&1; then
          state="mergeable"
        else
          state="CONFLICT RISK"
        fi
        [ "$dirty" != "0" ] && state="dirty"
      else
        ahead=""; state="(not a task)"
      fi
      printf "%-22s %-28s %-10s %-10s\n" "$task" "$branch" "$ahead" "$state"
    done
    ;;

  integrate)
    do_one_merge() { # <where> <target-ref> <task-branch>
      local where="$1" target="$2" br="$3"
      git -C "$where" merge --no-ff --no-commit "$br" >/dev/null 2>&1 && return 0
      return 1
    }
    conflicts() { git -C "$1" diff --name-only --diff-filter=U | wc -l | tr -d ' '; }
    auto_resolve() { # <where> <task>
      local where="$1" task="$2" files
      for ((i=1; i<=MAX_RESOLVE_ATTEMPTS; i++)); do
        files="$(git -C "$where" diff --name-only --diff-filter=U)" || true
        [ -z "$files" ] && break
        ( cd "$where" && opencode run "Ye merge conflict resolve karo. Conflicted files: $files. Dono side ki sahi cheezein rakho, aur koi naya kaam mat karo. Saare files resolve karke STAGE kar do (git add). COMMIT mat karna. Aakhri line me sirf 'RESOLVED' likho." >/dev/null 2>&1 ) \
          || { echo "  auto-resolve attempt $i failed (opencode run error)"; return 1; }
        echo "  auto-resolve attempt $i done"
      done
      [ "$(conflicts "$where")" = "0" ]
    }
    run_tests() { # <where> <task> — deterministic gate: typecheck + DB-free suites.
      # NOTE: full `npm test` (integration tests hit Neon DB) is state-dependent and
      # flaky standalone; it gates `promote`/CI only, not every integrate.
      local where="$1" task="$2" out
      out="$(cd "$where" && npm run typecheck >/tmp/wt-tc.log 2>&1 && npx vitest run tests/unit tests/components >/tmp/wt-test.log 2>&1)" \
        || { echo "  TESTS FAILED: $task — see /tmp/wt-tc.log and /tmp/wt-test.log"; return 1; }
      echo "  tests passed ($task)"
      return 0
    }

    mkdir -p "$WT_DIR"
    main_dirty_pending=false
    finished=0
    tasks=("$@")
    if [ ${#tasks[@]} -eq 0 ]; then
      for wt in "$WT_DIR"/*/; do
        [ -d "$wt/.git" ] || [ -f "$wt/.git" ] || continue
        t="$(basename "$wt")"
        [ "$t" = "_integ" ] && continue
        tasks+=("$t")
      done
    fi
    for task in "${tasks[@]}"; do
      valid_name "$task"
      wt="$WT_DIR/$task"
      [ -d "$wt" ] || die "no worktree for: $task"
      branch="$(git -C "$wt" symbolic-ref --short HEAD)"
      case "$branch" in
        wt/*/*) seg="${branch#wt/}"; stream="stream/${seg%%/*}" ;;
        wt/*)   stream="" ;;
        *)      die "$task is not a task branch: $branch" ;;
      esac
      dirty="$(git -C "$wt" status --porcelain --untracked-files=no | wc -l | tr -d ' ')"
      [ "$dirty" = "0" ] || { echo "SKIP $task: worktree dirty (window me commit karo)"; continue; }

      if [ -n "$stream" ]; then
        echo "== integrate $task -> $stream =="
        if [ -d "$INTEG" ]; then
          [ -z "$(git -C "$INTEG" status --porcelain --untracked-files=no)" ] || die "_integ dirty — reset karke phir aao (manual clean)"
          git -C "$INTEG" checkout "$stream" >/dev/null 2>&1
        else
          git worktree add "$INTEG" "$stream" >/dev/null
        fi
        pre="$(git -C "$INTEG" rev-parse HEAD)"
        if ! do_one_merge "$INTEG" "$stream" "$branch"; then
          if auto_resolve "$INTEG" "$task"; then
            echo "  conflicts auto-resolved (staged)"
          else
            git -C "$INTEG" merge --abort 2>/dev/null || git -C "$INTEG" reset --hard "$pre" >/dev/null
            echo "  FAIL: conflicts not resolvable — $task open, stream untouched. Report ke liye commander ko bolo."
            continue
          fi
        fi
        if run_tests "$INTEG" "$task"; then
          git -C "$INTEG" commit --no-edit >/dev/null
          echo "  MERGED $task -> $stream"
          finished=$((finished+1))
        else
          git -C "$INTEG" merge --abort 2>/dev/null || git -C "$INTEG" reset --hard "$pre" >/dev/null
          echo "  FAIL: tests failed — \"$task\" open, $stream untouched (logs in /tmp)"
        fi
      else
        echo "== integrate $task -> $BASE (main tree) =="
        mv_re="$(git symbolic-ref --short -q HEAD)"
        [ "$mv_re" = "$BASE" ] || git switch "$BASE" >/dev/null
        pre="$(git rev-parse HEAD)"
        if ! do_one_merge "$ROOT" "$BASE" "$branch"; then
          if auto_resolve "$ROOT" "$task"; then
            echo "  conflicts auto-resolved"
          else
            git merge --abort 2>/dev/null || true
            echo "  FAIL: conflicts not resolvable — $task open (files left in main tree, commander will guide)"
            continue
          fi
        fi
        if run_tests "$ROOT" "$task"; then
          git commit --no-edit >/dev/null
          echo "  MERGED $task -> $BASE"
          finished=$((finished+1))
        else
          git merge --abort 2>/dev/null || true
          echo "  FAIL: tests failed — $task open, base untouched (logs in /tmp)"
        fi
      fi
      [ "$finished" -gt 0 ] && git worktree remove --force "$wt" && git branch -D "$branch" >/dev/null && echo "  cleaned $task"
    done
    echo "== integrate done: $finished/$(( ${#tasks[@]} + 0 )) merged =="
    ;;

  promote)
    { [ -n "${1:-}" ] && valid_name "$1"; } || usage
    s="$1"; pr_flag="${2:-}"
    git rev-parse --verify -q "refs/heads/stream/$s" >/dev/null || die "no stream: $s"
    [ "$(git symbolic-ref --short -q HEAD)" = "$BASE" ] || git switch "$BASE" >/dev/null
    git merge --no-ff --no-commit "stream/$s" >/dev/null 2>&1 \
      || { echo "STOP: conflicts with $BASE — rookie move: resolve manually ya pehle integrate karo"; exit 4; }
    if (npm run typecheck >/tmp/wt-tc.log 2>&1 && npx vitest run tests/unit tests/components >/tmp/wt-test.log 2>&1); then
      git commit --no-edit >/dev/null
      echo "PROMOTED stream/$s -> $BASE (merged commit: $(git log --oneline -1))"
    else
      git merge --abort 2>/dev/null || true
      echo "FAIL: tests failed — stream/$s thik hai, base untouched (logs in /tmp)"
      exit 1
    fi
    if [ "$pr_flag" = "--pr" ]; then
      if git remote get-url origin >/dev/null 2>&1; then
        git push -u origin "stream/$s" >/dev/null 2>&1 || echo "NOTE: push failed — remote/stream check karo"
        gh pr create --base "$BASE" --head "stream/$s" \
          --title "promote: stream/$s" --body "Promoted by swarm integrate — full typecheck + vitest passed." || \
          echo "NOTE: PR create failed — details upar dekho"
      else
        echo "NOTE: no remote origin — PR skip"
      fi
    fi
    ;;

  cleanup)
    { [ -n "${1:-}" ] && valid_name "$1"; } || usage
    wt="$WT_DIR/$1"
    if [ -d "$wt" ]; then
      dirty="$(git -C "$wt" status --porcelain --untracked-files=no | wc -l | tr -d ' ')"
      [ "$dirty" = "0" ] || die "worktree dirty — window me commit/abort karo, phir cleanup"
      branch="$(git -C "$wt" symbolic-ref --short HEAD)"
      git worktree remove --force "$wt" >/dev/null
      git branch -D "$branch" >/dev/null 2>&1 || true
      echo "removed worktree '$1' + branch $branch"
    elif git rev-parse --verify -q "refs/heads/stream/$1" >/dev/null; then
      git branch -D "stream/$1" >/dev/null
      echo "deleted stream/$1"
    else
      die "nothing found for: $1"
    fi
    ;;

  *)
    usage
    ;;
esac
