#!/usr/bin/env bash
# setup-labels.sh — create the four agent labels idempotently. Safe to re-run.
set -euo pipefail

create_label() {
  local name="$1" color="$2" desc="$3"
  if gh label list --json name -q '.[].name' | grep -qx "$name"; then
    gh label edit "$name" --color "$color" --description "$desc" >/dev/null
  else
    gh label create "$name" --color "$color" --description "$desc" >/dev/null
  fi
}

create_label "agent-ready"        "0e8a16" "Queued for the agent. Issue body is complete and verifiable."
create_label "agent:in-progress"  "fef2c0" "A loop is actively working this issue."
create_label "agent:in-review"    "1d76db" "PR open, awaiting human review."
create_label "agent:needs-human"  "b60205" "Loop exhausted its iteration budget; see logs comment."

echo "agent labels present"
