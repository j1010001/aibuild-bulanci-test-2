#!/usr/bin/env bash
# verify.sh — the mechanical finish line. Exits 0 iff every layer passes.
# Layers run fastest-first and stop at the first failure.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

fail() {
  echo "VERIFY FAILED: $1" >&2
  exit 1
}

echo "== layer 1: static checks =="
npx tsc --noEmit || fail "tsc --noEmit (static)"
npx eslint . || fail "eslint (static)"

echo "== layer 2: unit tests =="
npx vitest run || fail "vitest (unit)"

echo "== layer 3: e2e smoke =="
npx playwright test || fail "playwright (e2e)"

echo "== verify: all layers green =="
