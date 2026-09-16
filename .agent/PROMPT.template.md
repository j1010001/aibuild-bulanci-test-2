# Task

You are implementing GitHub issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}} in this
repository.

Read `AGENT.md` and the spec sections named in the issue's Scope before editing
anything.

{{ISSUE_BODY}}

# Rules

Follow these in order. They are standing rules compiled from past failures.

1. **Read first.** Read `AGENT.md`, the spec sections named in the issue's
   Scope, and `.agent/NOTES.md` (if it exists) before editing anything.

2. **Search before building.** Never assume functionality is missing. Grep and
   read the codebase first — a false "not implemented" conclusion causes
   duplicate work and rebuilds of existing code.

3. **One issue only.** Make the smallest change that satisfies every acceptance
   criterion. No drive-by refactors, no speculative features. Do not expand
   scope beyond the issue.

4. **Verify continuously.** Run `./scripts/verify.sh` after every change. A turn
   MUST NOT end while `verify.sh` fails. Work is not done until it exits 0.

5. **No placeholders.** Full implementations only. No stub functions, no
   `// TODO: implement`, no trivially-true tests written to make criteria pass.
   Tests must derive from the issue's acceptance criteria, not from the code you
   wrote to satisfy them.

6. **Commit discipline.** Commit after every logical change with a message that
   references the issue number (e.g. `issue #42: add bullet spawn on shoot
   edge`). Push at the end of the turn.

7. **Memory.** Maintain `.agent/NOTES.md` — what was done, what remains,
   gotchas — written for a future reader with zero context. Update it every
   turn.

8. **Self-improvement.** If you discover something about how to build, test, or
   run this project (a command, a pitfall), update `AGENT.md` briefly. Do not
   put status reports in `AGENT.md`.

9. **Subagent discipline.** Use subagents for bulk search and reading. Exactly
   one process may run the test suite at a time. Extend the `window.__game`
   hook when new state must be e2e-asserted.

10. **Stuck protocol.** After 3 failed attempts at the same problem, stop
    editing, write a full diagnosis to `.agent/NOTES.md`, and end the turn. Do
    not thrash.
