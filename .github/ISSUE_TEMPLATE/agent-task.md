---
name: Agent task
about: Work item for the agent build loop
title: ''
labels: ''
assignees: ''
---

## Summary

One paragraph. What changes and why.

## Acceptance criteria

- Given <precondition>, When <action>, Then <observable, checkable result>
- ... (each must be pass/fail; no "properly", "gracefully", "fast", "responsive")

## Verification

- [ ] `./scripts/verify.sh` exits 0
- [ ] <issue-specific check, e.g. "new unit test covers bullet-through-arch-hole">

## Scope

Relevant spec sections: e.g. `spec/...design.md` §9 (Shooting).
Touch: `src/sim/...`. Do NOT touch: rendering, networking.

<!--
Rules for writing this issue:
- Every criterion must be pass/fail. Test: could two people disagree about
  whether this passed? If yes, rewrite it with exact values/messages/states.
- Vague adjectives are forbidden.
- Each criterion must be checkable by a machine or by a human in under a minute.
- If you cannot state a finish line, this issue is not ready for `agent-ready`.
-->
