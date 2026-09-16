#!/usr/bin/env bash
# build-prompt.sh <issue-number> — render .agent/PROMPT.md from the standing
# template plus the issue's number, title, and body. Run from a repo or
# worktree root (run-issue.sh runs it inside the worktree).
set -euo pipefail

issue="${1:?usage: build-prompt.sh <issue-number>}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

template="$root/.agent/PROMPT.template.md"
out="$root/.agent/PROMPT.md"

[ -f "$template" ] || { echo "missing $template" >&2; exit 1; }

gh issue view "$issue" --json number,title,body \
  | TEMPLATE="$template" OUT="$out" node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";

let raw = "";
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  const issue = JSON.parse(raw);
  let tpl = readFileSync(process.env.TEMPLATE, "utf8");
  tpl = tpl
    .replace(/\{\{ISSUE_NUMBER\}\}/g, String(issue.number))
    .replace(/\{\{ISSUE_TITLE\}\}/g, issue.title)
    .replace(/\{\{ISSUE_BODY\}\}/g, issue.body);
  writeFileSync(process.env.OUT, tpl);
});
'

echo "wrote $out"
