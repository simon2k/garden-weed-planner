<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Priority Bed Queue

- **Plan**: context/changes/priority-bed-queue/plan.md
- **Scope**: Phases 1-5 of 5
- **Date**: 2026-06-02
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Validation

- `npm run lint`: PASS
- `npm run build`: PASS
- `npx astro sync`: PASS on retry. First parallel run failed from inspector port collision (`EADDRINUSE 127.0.0.1:9230`), not app code.

## Findings

### F1 — Duplicate bed creation possible during in-flight submit

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/garden/GardenQueue.tsx:113
- **Detail**: `handleSubmit` does not early-return when `isSubmitting` is already true. The submit button is disabled, but rapid double submit / Enter during an in-flight request can still create duplicate beds.
- **Fix**: Add `if (isSubmitting) return;` at the start of `handleSubmit`.
- **Decision**: FIXED — Added an early `isSubmitting` guard to `handleSubmit`.

### F2 — Out-of-order GET responses can overwrite fresher queue state

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/garden/GardenQueue.tsx:85
- **Detail**: `loadBeds()` can run from mount, refresh, and post-create refresh. An older slower request can resolve after a newer one and overwrite `beds`.
- **Fix A ⭐ Recommended**: Add request sequencing so only the latest load updates state.
  - Strength: Small client-only fix; keeps manual refresh behavior.
  - Tradeoff: Slightly more state/ref logic.
  - Confidence: HIGH — common React async pattern.
  - Blind spot: Not tested under artificial network delay.
- **Fix B**: Serialize refreshes by disabling refresh while loading.
  - Strength: Simpler.
  - Tradeoff: Less robust if multiple loads are triggered from different paths.
  - Confidence: MEDIUM.
  - Blind spot: Still weaker than sequencing.
- **Decision**: SKIPPED — Accepted for now during triage.

### F3 — UI duplicates shared API/domain types

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/garden/GardenQueue.tsx:7
- **Detail**: `GardenQueue.tsx` redeclares `WeedLevel`, priority, confidence, and queue item types already exported from `src/lib/garden-beds.ts`.
- **Fix**: Import `GardenBedQueueItem` and `WeedLevel` types from `@/lib/garden-beds`.
- **Decision**: SKIPPED — Accepted for now during triage.

### F4 — Future `last_weeded_at` dates are accepted

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/garden-beds.ts:141
- **Detail**: Validation accepts any valid `YYYY-MM-DD`, including future “last weeded” dates. That may suppress urgency incorrectly.
- **Fix A ⭐ Recommended**: Leave as observation for now unless product requires historical-only dates.
  - Strength: Avoids adding unplanned validation policy.
  - Tradeoff: Future dates remain possible.
  - Confidence: MEDIUM — plan did not specify this constraint.
  - Blind spot: Product owner intent not verified.
- **Fix B**: Add server validation `last_weeded_at <= today` and set matching input `max`.
  - Strength: Better semantic data quality.
  - Tradeoff: Adds policy not specified in S-01 plan.
  - Confidence: MEDIUM.
  - Blind spot: Could block legitimate pre-scheduled/imported data if introduced later.
- **Decision**: ACCEPTED-AS-RULE: Validate date direction semantics — existing lesson covers this; code fix not applied now.

## Workspace Note

`AGENTS.md` is modified but outside the committed priority-bed-queue implementation scope. It appears to contain 10xDevs toolkit guidance, so treat it as unrelated workspace state unless intentionally part of this handoff.
