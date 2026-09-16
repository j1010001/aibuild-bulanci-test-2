#!/usr/bin/env bash
# run-issue.sh <issue-number> — the agent build loop.
#
# One run at a time (lockfile). The agent never touches the current branch:
# all work happens in .worktrees/issue-<N>, branched from origin/main.
# "Done" is decided by ./scripts/verify.sh exiting 0 — never by the agent.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

die() { echo "run-issue.sh: $*" >&2; exit 1; }

issue="${1:-}"
MAX_ITERATIONS="${MAX_ITERATIONS:-15}"

[ -n "$issue" ] || die "usage: run-issue.sh <issue-number>"

# 8.1 preflight
gh auth status >/dev/null 2>&1 || die "gh is not authenticated (run: gh auth login)"
gh issue view "$issue" >/dev/null 2>&1 || die "issue #$issue not found"

labels="$(gh issue view "$issue" --json labels -q '.labels[].name')"
echo "$labels" | grep -qx "agent-ready" || die "issue #$issue lacks the agent-ready label"
if echo "$labels" | grep -qx "agent:in-progress"; then
  die "issue #$issue is already agent:in-progress"
fi

[ -z "$(git status --porcelain)" ] || die "working tree is dirty; commit or stash first"

# 8.6 concurrency — lockfile guards the whole run
lock=".agent/run.lock"
mkdir "$lock" 2>/dev/null || die "another run is active (lock: $lock)"
trap 'rm -rf "$lock"' EXIT

# 8.2 claim
gh issue edit "$issue" --add-label agent:in-progress --remove-label agent-ready >/dev/null

# 8.3 isolate — fetch, then branch a fresh worktree from origin/main
git fetch origin --quiet || die "git fetch origin failed"
git rev-parse --verify --quiet refs/remotes/origin/main >/dev/null \
  || die "no origin/main; push an initial main first"

wt=".worktrees/issue-$issue"
[ -e "$wt" ] && die "worktree $wt already exists (stale from a previous run?)"
git worktree add "$wt" -b "issue-$issue" origin/main >/dev/null || die "git worktree add failed"
cd "$wt"

# The worktree is a fresh checkout: install deps so verify.sh can run here.
npm ci --silent || die "npm ci failed in the worktree"

# 8.4 assemble the per-issue prompt
./scripts/build-prompt.sh "$issue"

# 8.5 the loop
success=0
for i in $(seq 1 "$MAX_ITERATIONS"); do
  echo "== iteration $i/$MAX_ITERATIONS =="
  cat .agent/PROMPT.md | claude -p --dangerously-skip-permissions || true
  # CI=1 forces Playwright to spawn/teardown its own server per run, so e2e
  # always tests this worktree rather than a stale server on the port.
  if CI=1 ./scripts/verify.sh > .agent/last-verify.log 2>&1; then
    success=1
    break
  fi
  echo "== iteration $i: verify failed (see .agent/last-verify.log) =="
done

if [ "$success" -ne 1 ]; then
  # 8.7 exhaustion — leave the worktree and branch for human inspection
  {
    echo "The agent did not reach a green \`./scripts/verify.sh\` in $MAX_ITERATIONS iterations."
    echo
    echo 'Tail of `last-verify.log`:'
    echo '```'
    tail -n 40 .agent/last-verify.log
    echo '```'
  } | gh issue comment "$issue" --body-file -

  gh issue edit "$issue" --add-label agent:needs-human --remove-label agent:in-progress >/dev/null
  die "issue #$issue labeled agent:needs-human (budget exhausted)"
fi

# success — push branch, open PR, relabel
title="$(gh issue view "$issue" --json title -q .title)"
body="$(gh issue view "$issue" --json body -q .body)"

git push -u origin "issue-$issue" >/dev/null || die "git push failed"

pr_body=".agent/pr-body.md"
{
  echo "Closes #$issue"
  echo
  echo "## Acceptance criteria"
  echo "$body"
  echo
  echo "## Verification log (tail)"
  echo '```'
  tail -n 40 .agent/last-verify.log
  echo '```'
  echo
  echo "## E2E screenshots"
  if ls tests/e2e/output/*.png >/dev/null 2>&1; then
    ls tests/e2e/output/*.png
  else
    echo "(none)"
  fi
} > "$pr_body"

gh pr create --title "issue #$issue: $title" --body-file "$pr_body" || die "gh pr create failed"
gh issue edit "$issue" --add-label agent:in-review --remove-label agent:in-progress >/dev/null
echo "PR opened; issue #$issue labeled agent:in-review"
