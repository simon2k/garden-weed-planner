<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Priority Bed Queue Implementation Plan

- **Plan**: `context/changes/priority-bed-queue/plan.md`
- **Mode**: Deep
- **Date**: 2026-06-02
- **Verdict**: SOUND
- **Findings**: 0 critical, 2 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS |
| Plan Completeness | PASS |

## Grounding

Grounding: 11/11 paths ✓, 8/8 symbols ✓, brief↔plan ✓. Progress format: 1/1 Progress block ✓, 5/5 phases matched ✓, 46/46 checks matched ✓. Deep verification completed locally; sub-agent unavailable unless explicitly requested.

## Findings

### F1 — Navigation link may not be visible from authenticated app pages

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Phase 3 — Navigation link / Garden page
- **Detail**: The plan said `src/components/Topbar.astro` should make `/garden` discoverable for authenticated users. But code search showed `Topbar` is currently imported only by `src/components/Welcome.astro`, not by `src/pages/dashboard.astro` or `src/layouts/Layout.astro`. Adding a Garden link to `Topbar.astro` alone might not make the route discoverable from the authenticated dashboard flow.
- **Fix ⭐ Recommended**: Specify that `/garden` page and/or `/dashboard` must render `Topbar`, or move authenticated navigation into a shared layout used by both pages.
  - Strength: Ensures the success criterion “signed-in navigation shows a working link to `/garden`” can actually pass.
  - Tradeoff: Slightly broader Phase 3 scope than editing Topbar alone.
  - Confidence: HIGH — `grep` confirmed `Topbar` is only used by Welcome.
  - Blind spot: None significant.
- **Decision**: FIXED — Phase 3 now requires making authenticated navigation visible from the app flow, either by rendering `Topbar` on `/dashboard` and `/garden` or by moving navigation into a shared shell/layout.

### F2 — Missing-date priority and null sort order are underspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 — Priority score / queue sorting helper
- **Detail**: The plan correctly said `last_weeded_at` may be missing, suggested date should become `null`, and confidence should degrade. But it did not say how a missing suggested date sorts, or how missing `last_weeded_at` affects the priority score. This left implementers to guess whether `null` dates sort first, last, or only after priority/weed-level tie-breaks.
- **Fix ⭐ Recommended**: Add explicit rules: missing `suggested_weed_at` sorts after real suggested dates within the same priority bucket, and missing `last_weeded_at` contributes no elapsed-days boost but still allows weed level / area / time / mulch to influence score.
  - Strength: Keeps incomplete beds visible without letting unknown dates dominate the queue.
  - Tradeoff: This is a product heuristic; it may need adjustment later.
  - Confidence: MEDIUM — the plan’s intent was clear, but the exact heuristic was not defined.
  - Blind spot: Real user expectation for incomplete high-weed beds is untested.
- **Decision**: FIXED — Phase 1 now defines missing `last_weeded_at` scoring and `null` suggested-date sorting.

## Post-triage Verdict

All findings were fixed with targeted plan edits. The revised plan is safe to implement.

- **Updated verdict**: SOUND
