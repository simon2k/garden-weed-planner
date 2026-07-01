<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Reshape Interface Actions

- **Plan**: context/changes/reshape-interface-actions/plan.md
- **Scope**: Phases 1–4 of 4
- **Date**: 2026-07-01
- **Verdict**: APPROVED WITH WARNINGS
- **Findings**: 0 critical 2 warnings 0 observations

## Verification

- `npx astro sync` — PASS
- `npm run lint` — PASS
- `npm run test` — PASS
- `npm run test:e2e` — PASS
- `npm run build` — PASS

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Findings

### F1 — Action modals can unmount during post-submit queue refresh

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/garden/GardenQueue.tsx:623, src/components/garden/GardenQueue.tsx:750
- **Detail**: Observation and mark-weeded submits call `await loadBeds()` while the card-scoped modal is still logically open. `loadBeds()` sets global `isLoading`, which replaces the queue list with loading UI and can unmount the modal before refresh completes. If refresh fails, the modal still closes after the swallowed load error.
- **Fix A ⭐ Recommended**: Add a background queue refresh path that does not set global loading state, and close the modal only after that refresh path completes successfully.
  - Strength: Preserves the plan’s “close after successful update” intent without disrupting the current visible card/modal.
  - Tradeoff: Requires splitting `loadBeds()` behavior into full-load vs background-refresh modes.
  - Confidence: HIGH — the affected submit paths both call the same global loading function.
  - Blind spot: Browser timing may make this hard to notice manually.
- **Fix B**: Close immediately after successful POST/PATCH, then refresh the queue as non-blocking background work.
  - Strength: Simpler user flow and avoids modal unmount surprise.
  - Tradeoff: Weakens the plan’s stricter “close after refresh/update” sequencing.
  - Confidence: MEDIUM — acceptable UX, but slightly less faithful to plan.
  - Blind spot: Refresh failures need a visible non-blocking page message.
- **Decision**: FIXED via Fix A — added `refreshBedsInPlace()` for post-submit queue refreshes so observation and weeding modals are not unmounted by global loading state before close. Verified with `npm run lint`, `npm run test`, and `npm run test:e2e`.

### F2 — Priority E2E cleanup can race with sibling smoke test

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: e2e/priority-queue.spec.ts:3, e2e/priority-queue.spec.ts:25
- **Detail**: `playwright.config.ts` uses `fullyParallel: true`, while `priority-queue.spec.ts` defines a shared module-level `runId`. The priority test’s stale cleanup matches `weeded smoke` beds too, so it can delete the sibling smoke test’s bed during parallel execution.
- **Fix A ⭐ Recommended**: Generate unique run IDs inside each test and make stale cleanup match only that test’s own prefix.
  - Strength: Keeps parallelism and removes shared-state coupling.
  - Tradeoff: Slightly more setup code per test.
  - Confidence: HIGH — directly addresses shared identifiers and broad cleanup matching.
  - Blind spot: Existing stale data from older naming patterns may need one manual cleanup run.
- **Fix B**: Mark this describe block serial.
  - Strength: Minimal code change.
  - Tradeoff: Reduces parallelism and hides the shared-state smell.
  - Confidence: MEDIUM — prevents this race but not similar future coupling.
  - Blind spot: Other files can still race if they share cleanup patterns.
- **Decision**: FIXED via Fix A — moved priority E2E run IDs inside each test and narrowed stale cleanup to the priority-ordering prefix so fully parallel sibling tests do not delete each other's beds. Verified with `npm run lint`, `npm run test`, and `npm run test:e2e`.
