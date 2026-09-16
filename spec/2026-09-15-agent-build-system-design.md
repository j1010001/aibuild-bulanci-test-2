# Agent Build System — Design Specification

Date: 2026-09-15
Status: approved (design review)

## 1. Overview

This spec describes the **build system** to be constructed in this repository: an
issue-driven development loop in which a human files GitHub issues (bugs, features)
against the Browser Party Shooter game (see `spec/2026-09-15-browser-party-shooter-design.md`)
and an AI coding agent picks each issue up, implements it, verifies its work against a
mechanical finish line, and opens a pull request for human review.

The system is deliberately boring: bash scripts, the `gh` CLI, and the `claude` CLI.
No frameworks, no daemons, no multi-agent orchestration. Everything is inspectable.

**The human remains the operator.** The system is not autonomous fire-and-forget.
The operator's jobs: write issues with verifiable acceptance criteria, review PRs,
and tune the prompt/rules when the agent fails in a new way.

### Reading this spec

Sections 2–4 explain *how and why* the system works (the mental model).
Sections 5–10 are the *construction requirements* — what to build, file by file.
Sections 11–13 are acceptance criteria, build order, and known failure modes.

A coding agent instructed to "build the system described in this spec" should be
able to do so without asking questions. Where a judgment call remains, it is
marked DECISION with the recommended default.

## 2. How the system works (mental model)

### 2.1 The loop

The core is a loop that repeatedly invokes a coding agent on the same prompt:

```
for i in 1..MAX_ITERATIONS:
    cat PROMPT.md | claude -p      # one agent turn; full tool access
    if ./verify.sh passes:         # checked by bash, NOT by the agent
        open PR, exit 0
mark issue needs-human, exit 1
```

Each `claude -p` invocation is a fresh agent process. Two properties follow:

1. **The filesystem is the agent's memory.** An agent turn remembers nothing from
   previous turns. All continuity — what was done, what remains, what was learned —
   must live on disk: the code itself, git history, and `.agent/NOTES.md`.
2. **"Done" is decided by bash, not by the agent.** An agent stops when it *believes*
   the task is complete; the loop stops when `verify.sh` exits 0. The finish line is
   environmental and mechanical. This is the single most important design decision.

### 2.2 Issue-driven workflow (state machine)

Issues carry their state in GitHub labels. Exactly one state label at a time:

```
                operator files issue            run-issue.sh N          verify passes
┌──────────┐   with acceptance criteria   ┌──────────────┐   loop   ┌───────────┐
│ (no      │ ───────────────────────────► │ agent-ready  │ ───────► │ agent:    │
│  label)  │  operator adds label        │ (queued)     │  starts  │ in-progress│
└──────────┘                              └──────────────┘          └─────┬─────┘
                                                                          │
                    ┌─────────────────────────────────────────────────────┤
                    │ verify.sh exit 0                          MAX iterations
                    ▼                                          exhausted
             ┌─────────────┐                              ┌──────────────┐
             │ agent:      │  PR opened, operator reviews │ agent:       │
             │ in-review   │ ──► merged by HUMAN only     │ needs-human  │
             └─────────────┘                              └──────────────┘
                                                                   │
                                                                   ▼
                                              operator reads logs, tightens the
                                              issue criteria or the standing rules,
                                              re-labels agent-ready
```

Invariants:
- The agent **never merges**. Merging is a human action. The agent's deliverable is a PR.
- An issue is worked on **exactly one worktree/branch** (`issue-<N>`), never on `main`.
- A lockfile prevents two concurrent runs (see 8.6).
- `agent:needs-human` is a first-class outcome, not a crash. It means "the finish
  line was not reachable in the iteration budget; a human must intervene."

### 2.3 The verification stack (backpressure)

`verify.sh` is a single entrypoint that runs checks fastest-first and exits non-zero
at the first failure. The agent is instructed to run it after every change; the loop
script runs it after every agent turn. Layers:

| # | Layer | Command (indicative) | What it catches | Speed |
|---|---|---|---|---|
| 1 | Static | `tsc --noEmit` + `eslint` | Type errors, dead code, wrong APIs | seconds |
| 2 | Unit | `vitest run` | Logic regressions in the deterministic `sim` core | seconds |
| 3 | E2E smoke | Playwright against `npm run dev` | App doesn't boot, console errors, blank canvas, broken input→state wiring | tens of seconds |

Layer 3 requires a **test hook** in the game app (section 9): in dev builds the app
exposes game state on `window.__game` so Playwright can assert state transitions
(e.g., "after pressing Space, a bullet exists") instead of screenshot-guessing.
The game spec's solo **practice mode** is what makes layer 3 possible without WebRTC.

### 2.4 Why this shape (evidence base)

- One issue per loop turn, standing prompt re-read every iteration — the Ralph
  technique (Huntley). Prompt rules below are compiled from its documented failure
  modes (placeholder implementations, false "not implemented" conclusions, build/test
  backpressure from parallel test runs).
- Acceptance criteria in the issue, checked mechanically — spec-driven development
  (spec-kit) and the agent-readable acceptance-criteria pattern: every criterion must
  be pass/fail with no room for two readers to disagree.
- Single agent, human review gate, no multi-agent fan-out — coding tasks parallelize
  poorly (interdependent edits); Anthropic's production guidance and cost data
  (multi-agent ≈ 15× tokens) say start with one well-instrumented loop.

## 3. Scope

### In scope (this system)

- Bash scripts: `run-issue.sh`, `build-prompt.sh`, `verify.sh`, `setup-labels.sh`.
- Standing prompt template (`.agent/PROMPT.template.md`).
- GitHub issue template and label set.
- `AGENT.md` — the project's self-improving operating manual.
- A **minimal runnable app skeleton** (walking skeleton) so `verify.sh` has a green
  baseline from the first issue: Vite + TypeScript + three.js app that renders an
  empty 3D scene, plus vitest and Playwright wired up, plus the `window.__game`
  test hook, plus practice-mode entry point. The skeleton implements *no gameplay* —
  gameplay arrives through issues.
- `.gitignore` entries for `.agent/`, `.worktrees/`, Playwright output.

### Out of scope

- Automatic issue pickup (watcher daemon). The operator runs `run-issue.sh N`
  by hand. (Natural later graduation: a 30-line polling wrapper.)
- Multi-agent orchestration, dependency-graph issue trackers, merge queues.
- Implementing the game itself — that happens through issues after the system exists.
- CI hosting. `verify.sh` is designed to be CI-able later, but no CI config is built.

## 4. Repository layout after construction

```
├── spec/                                  # existing — game design spec(s)
├── .github/
│   └── ISSUE_TEMPLATE/
│       └── agent-task.md                  # issue template with acceptance criteria
├── .agent/
│   └── PROMPT.template.md                 # standing rules (checked in)
├── scripts/
│   ├── run-issue.sh                       # the loop
│   ├── build-prompt.sh                    # assembles per-issue PROMPT.md
│   ├── verify.sh                          # the finish line
│   └── setup-labels.sh                    # one-time label creation
├── src/                                   # walking skeleton app (Vite + TS + three.js)
│   └── ...                                #   (gameplay added later via issues)
├── tests/
│   ├── unit/                              # vitest (starts nearly empty)
│   └── e2e/                               # Playwright smoke suite
├── AGENT.md                               # how to build/test/run; agent-maintained
├── BUILD-SYSTEM-README.md                 # operator documentation (exists already)
├── package.json, tsconfig.json, vite config, playwright.config.ts, vitest config
└── .gitignore
```

Runtime artifacts (gitignored): `.agent/PROMPT.md`, `.agent/NOTES.md`,
`.agent/last-verify.log`, `.worktrees/issue-<N>/`, `.agent/run.lock`.

## 5. GitHub configuration

### 5.1 Labels (created by `scripts/setup-labels.sh`, idempotent)

| Label | Color | Meaning |
|---|---|---|
| `agent-ready` | green | Queued for the agent. Issue body is complete and verifiable. |
| `agent:in-progress` | yellow | A loop is actively working this issue. |
| `agent:in-review` | blue | PR open, awaiting human review. |
| `agent:needs-human` | red | Loop exhausted its iteration budget; see logs comment. |

### 5.2 Issue template (`.github/ISSUE_TEMPLATE/agent-task.md`)

Required sections, in this order:

```markdown
## Summary
One paragraph. What changes and why.

## Acceptance criteria
- Given <precondition>, When <action>, Then <observable, checkable result>
- ... (each must be pass/fail; no "properly", "gracefully", "fast")

## Verification
- [ ] `./scripts/verify.sh` exits 0
- [ ] <issue-specific check, e.g. "new unit test covers bullet-through-arch-hole">

## Scope
Relevant spec sections: e.g. `spec/...design.md` §9 (Shooting).
Touch: `src/sim/...`. Do NOT touch: rendering, networking.
```

Rules the template must state in comments: criteria must be checkable by a machine
or by a human in under a minute; vague adjectives are forbidden; if the writer
cannot state a finish line, the issue is not ready to be labeled `agent-ready`.

## 6. The standing prompt (`.agent/PROMPT.template.md`)

`build-prompt.sh` renders the template into `.agent/PROMPT.md` by substituting
`{{ISSUE_NUMBER}}`, `{{ISSUE_TITLE}}`, `{{ISSUE_BODY}}`. The rendered prompt is
re-fed to the agent every iteration unchanged. Template content requirements:

1. **Role and task**: "You are implementing GitHub issue #{{ISSUE_NUMBER}}:
   {{ISSUE_TITLE}} in this repository." followed by the full issue body.
2. **Read first**: `AGENT.md`, the referenced spec sections, and `.agent/NOTES.md`
   (if it exists) — before editing anything.
3. **Search before building**: never assume functionality is missing; grep/read the
   codebase first. (False "not implemented" conclusions cause duplicate work.)
4. **One issue only**: the smallest change that satisfies every acceptance criterion.
   No drive-by refactors, no speculative features.
5. **Verify continuously**: run `./scripts/verify.sh` after every change; a turn MUST
   NOT end while `verify.sh` fails. Work is not done until it passes.
6. **No placeholders**: full implementations only. No stub functions, no
   `// TODO: implement`, no trivially-true tests written to make criteria pass.
   Tests must derive from the issue's acceptance criteria, not from the code written.
7. **Commit discipline**: commit after every logical change with a message referencing
   the issue number (`issue #42: add bullet spawn on shoot edge`). Push at end of turn.
8. **Memory**: maintain `.agent/NOTES.md` — what was done, what remains, gotchas —
   written for a future reader with zero context. Update it every turn.
9. **Self-improvement**: if you discover something about how to build, test, or run
   this project (a command, a pitfall), update `AGENT.md` briefly. Do not put status
   reports in `AGENT.md`.
10. **Subagent discipline**: use subagents for bulk search/reading; exactly one
    process runs the test suite at a time.
11. **Stuck protocol**: after 3 failed attempts at the same problem, stop editing,
    write a full diagnosis to `.agent/NOTES.md`, and end the turn. Do not thrash.

## 7. `scripts/verify.sh` contract

- Runs from the repo root (or a worktree root) with no arguments.
- Executes layers in order: static → unit → e2e. Stops at first failure.
- Prints a clear per-layer banner (`== layer 2: unit tests ==`) to stdout.
- Exit 0 iff all layers pass. Any failure → exit 1.
- E2E layer boots the dev server itself (Playwright webServer config), runs the
  smoke suite, and tears it down. Smoke suite v1 (against the walking skeleton):
  1. Home page loads with zero browser console errors.
  2. The 3D canvas renders non-blank pixels (screenshot compared against blank).
  3. Practice mode: `window.__game.getState()` returns a state object; after
     dispatching a movement key, the player position changes; after Space, a bullet
     appears (once gameplay exists — skeleton version asserts the hook exists and
     returns an object).
- Screenshots from the e2e run are written to `tests/e2e/output/` for PR evidence.

## 8. `scripts/run-issue.sh` behavior

Usage: `./scripts/run-issue.sh <issue-number>` from the repo root.

Step-by-step requirements:

8.1 **Preflight** — fail fast with a clear message if: no argument; `gh auth status`
fails; issue does not exist; issue lacks label `agent-ready`; issue is open but
already `agent:in-progress`; the git working tree is dirty.

8.2 **Claim** — `gh issue edit N --add-label agent:in-progress --remove-label agent-ready`.

8.3 **Isolate** — `git fetch origin`, then
`git worktree add .worktrees/issue-N -b issue-N origin/main`. All agent work happens
inside the worktree. `main` is never touched by the agent.

8.4 **Assemble prompt** — run `build-prompt.sh N` inside the worktree, producing
`.worktrees/issue-N/.agent/PROMPT.md` from the template plus the issue body
(`gh issue view N --json title,body`).

8.5 **Loop** — `MAX_ITERATIONS` default 15, overridable via env
(`MAX_ITERATIONS=25 ./scripts/run-issue.sh 7`). Per iteration:
- `cat .agent/PROMPT.md | claude -p --dangerously-skip-permissions`
  (DECISION: the flag is required for unattended operation; the blast radius is
  contained to the worktree. Document this prominently in the README.)
- then `./verify.sh > .agent/last-verify.log 2>&1`.
- If verify exits 0: **success path** — push branch, open PR with
  `gh pr create --title "issue #N: <title>" --body-file -` where the PR body contains:
  the issue link, the full acceptance criteria, the *tail of last-verify.log* as
  evidence, and the e2e screenshot paths. Relabel `agent:in-review` (remove
  `agent:in-progress`). Exit 0.

8.6 **Concurrency** — a lockfile `.agent/run.lock` (created with `mkdir`, the
portable atomic primitive) guards the whole run; a second invocation exits
immediately with "another run is active (lock: …)". Lock is removed on every exit
path via `trap`.

8.7 **Exhaustion path** — after MAX_ITERATIONS without green verify:
`gh issue comment N` with the tail of `last-verify.log` and a note that the agent
could not reach the finish line; relabel `agent:needs-human` (remove
`agent:in-progress`). Exit 1. The worktree and branch are left in place for
inspection — never auto-deleted.

8.8 **No state in the script** — the script holds no memory between invocations.
Everything it needs is in GitHub (issue, labels), git (branch, commits), or the
worktree (`.agent/` files).

## 9. Requirement on the game app: the test hook

The walking skeleton — and all later game code — must expose, in dev mode only:

```ts
window.__game = {
  getState(): unknown,        // serializable snapshot of current sim/menu state
  press(key: string): void,   // dispatch a normalized input as if from the keyboard
}
```

This is what makes e2e verification assertions possible (`expect(state.bullets).toHaveLength(1)`)
instead of pixel-diffing. The hook is behind an env check so production builds
exclude it. Gameplay issues that add state must extend the hook's state exposure
accordingly; the standing prompt says so.

## 10. `AGENT.md` contract

Created at bootstrap with the minimal operating manual: how to install, run dev
server, run each verify layer individually, project layout, and the "rules of the
repo" (deterministic sim is pure TS with no DOM imports; state changes only via
`step()`; etc., per the game spec's architecture section). Thereafter the agent
maintains it per standing rule 9. It is checked into git — its evolution is
reviewable in PR diffs.

## 11. Acceptance criteria for THIS system

The system is built when all of the following hold (each is pass/fail):

1. **Scripts exist and are executable**: the four scripts in section 4, plus
   `.agent/PROMPT.template.md`, `AGENT.md`, the issue template, and the walking
   skeleton app. Given a fresh clone, When following `BUILD-SYSTEM-README.md`
   setup steps, Then `./scripts/verify.sh` exits 0.
2. **Labels**: Given `setup-labels.sh` has run, When `gh label list` is executed,
   Then all four labels from 5.1 exist. Re-running the script changes nothing.
3. **Verify catches failure**: Given a deliberately introduced type error, When
   `./scripts/verify.sh` runs, Then it exits 1 and the output names the failing layer.
4. **End-to-end issue cycle**: Given issue #1 labeled `agent-ready` whose criteria are
   "the home page displays the text entered in the issue body", When
   `./scripts/run-issue.sh 1` completes, Then either (a) a PR exists labeled
   `agent:in-review` whose diff implements the criteria and whose body contains the
   verify log, or (b) issue #1 is labeled `agent:needs-human` with a logs comment.
   (This criterion exercises the loop against a trivially-verifiable issue.)
5. **Locking**: Given a run in progress, When a second `run-issue.sh` is invoked,
   Then it exits immediately non-zero with a lock message.
6. **Prompt completeness**: `grep` of the rendered `.agent/PROMPT.md` finds every
   standing rule from section 6 (spot-check rules 3, 5, 6, 7 by their key phrases).
7. **Agent never on main**: after any completed or failed run,
   `git branch --show-current` in the main checkout is unchanged and `git status`
   is clean.
8. **No placeholders escape**: the standing prompt contains the no-placeholder rule
   (rule 6) verbatim in substance.

## 12. Build order

1. **Skeleton + verify first**: scaffold the app, `verify.sh` with all three layers
   green against the empty scene. This proves the finish line works before the loop
   exists.
2. **Labels + issue template + AGENT.md + prompt template.**
3. **`build-prompt.sh`, then `run-issue.sh`** (with lockfile and both exit paths).
4. **Self-test**: file issue #1 (criterion 11.4), run the loop against it.
   Iterate on the prompt until the loop completes it. This first run is expected to
   expose prompt gaps — that is its purpose.
5. **Seed game issues**: the operator then files gameplay issues derived from the
   game spec, one per concern, each with acceptance criteria, starting with the
   `sim` core (pure, unit-testable) before rendering/networking.

## 13. Known failure modes (operator's field guide)

| Symptom | Cause | Fix |
|---|---|---|
| PR implements a stub that "passes" | Criterion too weak | Tighten criterion; restate rule 6 with the observed trick named |
| Agent rebuilds existing code | Didn't search first | Rule 3 exists; add the specific symbol it missed to NOTES/AGENT.md |
| Loop edits forever, never green | Finish line unreachable or broken verify | Read `last-verify.log`; fix verify or split the issue |
| Tests mirror the code, not the spec | Self-confirming tests | Reject PR; demand criteria-derived tests in the issue's Verification section |
| Same failure across 3+ iterations | Thrashing | Stuck protocol (rule 11) should have fired; tighten it with the observed pattern |
| Context bloat, slow turns | Agent reading whole repo each turn | Enforce subagent rule (10); narrow the issue's Scope section |

Every new failure mode observed in practice → add a row here and a rule to the
prompt. That tuning loop *is* the operating model, not a symptom of the system
failing.
