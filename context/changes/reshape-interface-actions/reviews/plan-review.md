<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Reshape Interface Actions Implementation Plan

- **Plan**: `context/changes/reshape-interface-actions/plan.md`
- **Mode**: Deep
- **Date**: 2026-07-01
- **Verdict**: SOUND
- **Findings**: 0 critical, 3 warnings, 0 observations — all fixed

## Verdicts

| Dimension             | Verdict |
| --------------------- | ------- |
| End-State Alignment   | PASS    |
| Lean Execution        | PASS    |
| Architectural Fitness | PASS    |
| Blind Spots           | PASS    |
| Plan Completeness     | PASS    |

## Grounding

8/8 paths ✓, key symbols ✓, brief↔plan ✓, Progress↔Phase ✓

## Findings

### F1 — Modal accessibility contract is underspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Critical Implementation Details / Phase 1
- **Detail**: The plan says the local modal must be “accessible enough” and mentions labels, Escape/backdrop close, and visible close control. But it does not explicitly require focus behavior: move focus into dialog on open, prevent background focus while open, restore focus to opener on close, and use `role="dialog"` / `aria-modal`.
- **Fix**: Add explicit modal accessibility acceptance criteria to Phase 1.
  - Strength: Makes the local primitive implementable and reviewable.
  - Tradeoff: Slightly more implementation work.
  - Confidence: HIGH — no existing modal primitive exists in the repo.
  - Blind spot: Exact focus-trap approach still needs implementation choice.
- **Decision**: FIXED — Added explicit dialog role, aria-modal, focus entry, focus containment, and focus restoration requirements to the plan.

### F2 — New bed-level modal state cleanup is not specified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 — Bed Card Tabs, Action Modals, and Delete X
- **Detail**: The plan says removing a bed must clear active tab state and existing per-bed state, but Phase 2 introduces new modal-open state for observation/weeding/plant creation. If a modal is open when a bed is deleted, stale modal state could reference a deleted bed.
- **Fix**: Specify that `removeDeletedBedState` also clears any bed-level modal-open state for that bed.
- **Decision**: FIXED — Added bed-level modal-open state to the required deleted-bed cleanup contract.

### F3 — Highest-risk modal flows remain manual-only

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 4 — E2E Updates and Final Verification
- **Detail**: The plan identifies state sequencing as a core risk: modal validation errors stay open, successful submits close, state refreshes correctly. But automated E2E updates only cover add/delete bed and priority ordering. Observation/weeding/plant modal lifecycles are left to manual testing.
- **Fix A ⭐ Recommended**: Add one minimal E2E smoke path for a bed-level modal, preferably mark-weeded.
  - Strength: Covers tab selection + modal open + submit + close + queue refresh.
  - Tradeoff: More Playwright maintenance.
  - Confidence: MEDIUM — existing E2E auth/setup already supports `/garden`.
  - Blind spot: Does not cover every bed-level modal.
- **Fix B**: Keep bed-level modal flows manual-only, but make this an explicit accepted risk in the plan.
  - Strength: Preserves current scope.
  - Tradeoff: Regression risk stays higher during a large React refactor.
  - Confidence: HIGH — this matches the plan’s current “no new E2E scenarios” boundary.
  - Blind spot: Manual verification quality depends on human follow-through.
- **Decision**: FIXED — Applied Fix A; added a minimal mark-weeded modal E2E smoke requirement to Phase 4 and Testing Strategy.
