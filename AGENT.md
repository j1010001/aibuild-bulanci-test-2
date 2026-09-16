# AGENT.md — operating manual

How to install, run, and test this repo. Maintained by the agent (see the
standing prompt rule "Self-improvement"); reviewable in PR diffs.

## Setup

```bash
npm install
npx playwright install chromium
```

## Run and build

| Action | Command |
|---|---|
| Dev server | `npm run dev` → http://localhost:5173 |
| Type-check only | `npx tsc --noEmit` |
| Lint only | `npm run lint` |
| Unit tests only | `npm run test:unit` |
| E2E smoke only | `npm run test:e2e` |
| The finish line | `./scripts/verify.sh` |

`verify.sh` runs layers fastest-first and stops at the first failure:
static (`tsc` + `eslint`) → unit (`vitest`) → e2e (Playwright).

## Layout

- `src/sim/` — pure, deterministic simulation core. Unit-test everything here.
- `src/main.ts` — three.js bootstrap, render loop, keyboard input, dev-only
  test hook.
- `tests/unit/` — vitest.
- `tests/e2e/` — Playwright smoke suite; asserts state via `window.__game`.
- `.agent/PROMPT.template.md` — standing rules for the agent loop (checked in).
- `scripts/` — `verify.sh` (finish line), `run-issue.sh` (the loop),
  `build-prompt.sh`, `setup-labels.sh`.

## Rules of the repo

- The simulation core (`src/sim/`) is pure TypeScript: no DOM, no three.js, no
  WebRTC imports. It must stay deterministic and unit-testable.
- State changes only through `sim.step(state, input, dt)`, which returns a new
  state object. Never mutate state in place.
- The dev-only test hook `window.__game` exposes `getState()` and `press(key)`.
  Any new state surfaced for e2e assertions goes through this hook.

## Guidelines (accumulated)

- (none yet — the agent adds a line here whenever it learns a pitfall)
