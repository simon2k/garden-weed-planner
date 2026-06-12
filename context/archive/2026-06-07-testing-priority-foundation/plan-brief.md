# Testing Priority Foundation — Plan Brief

> Full plan: `context/changes/testing-priority-foundation/plan.md`
> Research: `context/changes/testing-priority-foundation/research.md`

## What & Why

We are adding the project’s first automated test foundation. The goal is to protect the highest-priority product risk first: wrong garden-bed priority or suggested next-weeding dates.

## Starting Point

The app has lint/build validation but no test runner, no `npm test`, and no real test files. The durable test plan already names this as Phase 1: “Test foundation + priority oracle.”

## Desired End State

Vitest is installed and configured for pure TypeScript domain tests. Priority/date and mark-weeding validation behavior have deterministic tests, `npm run test` is enforced in CI, and the Phase 1 cookbook entries explain how future contributors add similar tests.

## Key Decisions Made

| Decision      | Choice                                | Why                                                                          | Source           |
| ------------- | ------------------------------------- | ---------------------------------------------------------------------------- | ---------------- |
| Runner scope  | Vitest domain-unit only               | Lowest-cost signal for priority/date behavior without Worker/Supabase setup. | Plan             |
| CI timing     | Enforce `npm run test` in Phase 1     | A new test floor should not remain optional once tests land.                 | Plan             |
| Test target   | Priority/date plus weeding validation | Covers risks #1 and #4 plus the date-direction lesson.                       | Research / Plan  |
| Time handling | Fake timers for date-boundary tests   | Prevents calendar and timezone flakiness.                                    | Research / Plan  |
| Cookbook      | Fill Phase 1 entries only             | Documents shipped patterns without inventing future API/UI guidance.         | Test plan / Plan |

## Scope

**In scope:**

- Add Vitest dependency, scripts, lockfile update, and config.
- Add unit tests under `src/lib/*` for priority/date and weeding validation behavior.
- Add `npm run test` to CI.
- Update Phase 1 cookbook guidance in `context/foundation/test-plan.md`.
- Update `AGENTS.md` only if existing testing guidance becomes stale.

**Out of scope:**

- Cloudflare Workers Vitest integration.
- Supabase CLI/RLS tests.
- API integration tests.
- React component, UI smoke, or e2e tests.
- Coverage thresholds.

## Architecture / Approach

Keep Phase 1 small and deterministic: Vitest runs in a Node environment against pure domain helpers in `src/lib/*`. Tests encode product outcomes rather than copying implementation formulas. Later phases can add Worker/API/RLS/UI layers once this base pattern exists.

## Phases at a Glance

| Phase                                 | What it delivers                                                                         | Key risk                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1. Bootstrap Vitest Foundation        | Test scripts, dependency, lockfile, and `vitest.config.ts`.                              | Misconfiguring tests with unnecessary Worker/browser/Supabase setup. |
| 2. Add Priority and Date Oracle Tests | Deterministic tests for priority, suggested dates, observations, and weeding validation. | Tests mirror implementation instead of product scenarios.            |
| 3. Wire CI and Phase 1 Cookbook       | CI `npm run test` gate plus durable test-plan cookbook updates.                          | Cookbook or AGENTS guidance drifts from actual commands.             |

**Prerequisites:** Existing research at `context/changes/testing-priority-foundation/research.md`; Node `22.14.0`; npm.
**Estimated effort:** ~2-3 focused sessions across 3 phases.

## Open Risks & Assumptions

- Vitest is assumed sufficient for pure TypeScript domain tests; Worker/API fidelity is deferred intentionally.
- Existing date helpers may expose timezone edge cases once fake timers are added.
- CI enforcement can block PRs immediately if tests are flaky, so date tests must be deterministic.

## Success Criteria (Summary)

- `npm run test` exists, passes locally, and runs in CI.
- Priority/date and weeding validation tests protect user-visible behavior without secrets or external services.
- `context/foundation/test-plan.md` tells future contributors where these tests live and how to add another one.
