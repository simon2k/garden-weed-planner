# Refresh test plan after E2E rollout — Plan Brief

> Full plan: `context/changes/test-plan-refresh-2026-06-15/plan.md`

## What & Why

Refresh `context/foundation/test-plan.md` after the project added Playwright E2E coverage and local pre-push E2E validation. The plan should now reflect shipped E2E patterns while keeping the remaining observation-driven queue-ordering gap visible.

## Starting Point

The current test plan still says E2E is not installed and that pre-push delegates only to the unit suite. The repo now has Vitest domain tests, Playwright E2E specs, and `npm run test:pre-push` running unit + E2E.

## Desired End State

The refreshed test plan accurately describes the current stack, gates, and cookbook patterns. It records basic priority-queue E2E as shipped coverage while keeping observation-pressure-driven queue ordering as a Phase 3 gap.

## Key Decisions Made

| Decision                    | Choice                           | Why (1 sentence)                                                                      | Source |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| Refresh scope               | Status + gaps + cookbook         | Keeps the diff focused while addressing stale facts and the new risk gap.             | Plan   |
| Observation-driven ordering | Add to Phase 3                   | The concern is rendered UI queue order after observations affect priority.            | Plan   |
| Risk #1 status              | Partially covered                | Basic ordering has E2E coverage, but observation pressure ordering is not yet proven. | Plan   |
| Pre-push E2E                | Required local hook, not CI gate | This matches repo scripts without inventing CI auth/storageState support.             | Plan   |

## Scope

**In scope:**

- Update `context/foundation/test-plan.md` stack, gates, cookbook, and freshness ledger.
- Make observation-driven queue ordering visible as a remaining Phase 3 UI smoke gap.
- Document shipped E2E seed and priority queue patterns.

**Out of scope:**

- Adding new tests.
- Changing app code, CI, hooks, or Playwright config.
- Rewriting the whole risk strategy.
- Promoting E2E to a CI-required gate.

## Architecture / Approach

This is a documentation refresh. The implementation updates only the durable test-plan artifact, using current repository evidence from `package.json`, Playwright/Vitest configs, E2E specs, and the refresh interview captured in `change.md`.

## Phases at a Glance

| Phase                                    | What it delivers                                | Key risk                                                          |
| ---------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| 1. Refresh stack and quality gates       | Accurate current tooling and local gate status  | Plan says tests are absent or optional when they are not          |
| 2. Refresh observation-ordering guidance | Phase 3 points at the remaining UI ordering gap | Risk #1 appears fully solved when observations are untested in UI |
| 3. Refresh cookbook patterns             | Actionable E2E and unit-test guidance           | Future tests copy stale or incomplete conventions                 |

**Prerequisites:** Existing `context/foundation/test-plan.md`, Playwright/Vitest setup, and refresh notes in `change.md`.
**Estimated effort:** ~1 implementation session across 3 documentation phases.

## Open Risks & Assumptions

- The plan assumes no CI E2E gate exists until proven otherwise.
- The observation-driven ordering gap is based on user concern and current coverage review, not a known production incident.
- The refresh should preserve evidence-only risk sources and avoid file:line anchors in the risk map.

## Success Criteria (Summary)

- The test plan no longer claims E2E is absent.
- The test plan clearly distinguishes shipped basic priority E2E from the remaining observation-driven ordering gap.
- The cookbook tells future contributors how to add E2E tests with role locators, state waits, unique data, relative dates, and cleanup.
