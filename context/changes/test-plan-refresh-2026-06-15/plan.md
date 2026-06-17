# Refresh test plan after E2E rollout Implementation Plan

## Overview

Refresh `context/foundation/test-plan.md` so it matches the repository's current testing reality after the Playwright E2E rollout. The refresh is intentionally scoped: update stack/gates/cookbook, record the shipped priority-queue E2E pattern, and make the remaining observation-driven queue-ordering gap explicit without rewriting the whole strategy.

## Current State Analysis

The existing test plan was last updated on 2026-06-07 and still describes E2E as not yet installed. Since then the project added Playwright, two E2E specs, and a pre-push path that runs unit tests plus E2E.

### Key Discoveries:

- `package.json` defines `test:e2e` as `playwright test` and `test:pre-push` as `npm run test && npm run test:e2e`.
- `playwright.config.ts` starts the Astro dev server and runs specs under `e2e/` using `playwright/.auth/user.json` storage state.
- `e2e/seed.spec.ts` documents the plain E2E conventions for UI-driven add/delete flows with role locators and state waits.
- `e2e/priority-queue.spec.ts` covers `context/foundation/test-plan.md` risk #1 for basic priority queue ordering with relative dates and UI cleanup.
- `context/changes/test-plan-refresh-2026-06-15/change.md` records the refresh concern: weed observations may change pressure and sort the queue incorrectly in the rendered UI.
- `context/foundation/lessons.md` requires explicit date-direction semantics and warns against brittle route ID validation.

## Desired End State

`context/foundation/test-plan.md` accurately reflects the current test base: Vitest domain tests, Playwright E2E tests, and local pre-push unit+E2E validation. It also distinguishes shipped basic priority-queue E2E coverage from the still-open observation-driven queue-ordering risk.

### Key Discoveries:

- The plan should not claim risk #1 is fully solved: basic ordering has coverage, but observation pressure changing UI order remains a gap.
- Phase 3 should explicitly include observation-driven queue ordering as a browser-level/UI smoke target.
- E2E should be described as a local hook gate today, not as a required CI gate, because CI auth/storageState handling has not been planned.

## What We're NOT Doing

- Not rewriting the whole test strategy or replacing the risk map from scratch.
- Not adding new tests in this change.
- Not changing app code, Playwright config, Husky hooks, or CI workflows.
- Not promoting E2E to a required CI gate.
- Not adding file:line anchors to risk-map Source cells; sources remain evidence, not implementation anchors.

## Implementation Approach

Make a small, evidence-preserving documentation refresh to `context/foundation/test-plan.md`. The plan should update stale factual sections, add the observation-driven ordering gap where it belongs, and expand cookbook guidance with the E2E patterns already shipped.

## Phase 1: Refresh stack and quality gates

### Overview

Update factual status sections so the test plan no longer says E2E is absent and no longer understates the local pre-push gate.

### Changes Required:

#### 1. Stack table and grounding notes

**File**: `context/foundation/test-plan.md`

**Intent**: Update §4 Stack to reflect the current test base: Vitest domain tests and Playwright E2E tests now exist. Keep the sparse-suite framing because coverage is still concentrated in `src/lib` and `e2e`.

**Contract**: The `unit + integration` and `e2e` rows must describe the actual tools and patterns now present. The stack grounding note should be refreshed to 2026-06-16 and should not claim Playwright/browser runtime is unavailable.

#### 2. Quality gates and hook notes

**File**: `context/foundation/test-plan.md`

**Intent**: Update §5 and §6.5 to show that local pre-push runs both unit and E2E tests. Avoid overstating CI behavior.

**Contract**: `npm run test:e2e` and `npm run test:pre-push` should be documented as local gates. CI-required language remains limited to the gates actually known from repo config and existing plan context.

### Success Criteria:

#### Automated Verification:

- `npm run test:pre-push` passes after the documentation refresh.
- Markdown file exists and remains readable: `test -f context/foundation/test-plan.md`.
- The refreshed plan mentions `npm run test:e2e`, `npm run test:pre-push`, Vitest, and Playwright.

#### Manual Verification:

- Human confirms the plan distinguishes local pre-push E2E from CI-required gates.
- Human confirms §4 no longer says E2E is absent.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Refresh risk and rollout guidance for observation-driven ordering

### Overview

Make the new user-stated concern explicit: observation pressure may affect queue order incorrectly even though basic priority ordering has E2E coverage.

### Changes Required:

#### 1. Risk response guidance

**File**: `context/foundation/test-plan.md`

**Intent**: Clarify that risk #1 has partial shipped protection but still needs observation-driven queue-ordering coverage. Preserve the existing risk framing rather than splitting it into a new top-level risk unless the wording becomes clearer with a sub-note.

**Contract**: §2 should keep evidence-only sources. It may update the Risk Response Guidance row for risk #1 to mention observation pressure affecting rendered queue order as a remaining proof target.

#### 2. Phased rollout table

**File**: `context/foundation/test-plan.md`

**Intent**: Update §3 so Phase 3 explicitly targets observation-driven queue ordering as part of critical garden UI smoke.

**Contract**: Phase 3 remains the home for UI smoke. Do not create a new standalone rollout phase just for this gap.

### Success Criteria:

#### Automated Verification:

- The refreshed plan contains a Phase 3 reference to observation-driven queue ordering or observation pressure affecting queue order.
- The refreshed plan still contains the strategy principle that risks are scenarios, not code locations.

#### Manual Verification:

- Human confirms risk #1 is presented as partially covered, not fully closed.
- Human confirms the observation-driven queue-ordering gap is visible enough for a future `/10x-e2e` or rollout phase.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Refresh cookbook patterns

### Overview

Update §6 so future contributors know how to add tests using the shipped patterns: domain-unit priority tests, UI seed smoke, priority queue E2E, unique data, state waits, role locators, relative dates, and cleanup.

### Changes Required:

#### 1. E2E cookbook

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the `TBD` UI smoke cookbook with concrete guidance based on `e2e/seed.spec.ts` and `e2e/priority-queue.spec.ts`.

**Contract**: The cookbook should mention role locators, waiting for state, unique test data, UI cleanup, `storageState`, and relative dates for date-sensitive priority assertions.

#### 2. Per-rollout notes and freshness ledger

**File**: `context/foundation/test-plan.md`

**Intent**: Update §6.6 and §8 so the plan records that E2E seed/priority patterns shipped and the strategy was refreshed on 2026-06-16.

**Contract**: The freshness ledger should reflect the refresh date. Negative-space exclusions remain unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run test:e2e` passes after the cookbook refresh.
- `npm run test` passes after the cookbook refresh.
- The refreshed cookbook references `e2e/seed.spec.ts` and `e2e/priority-queue.spec.ts`.

#### Manual Verification:

- Human confirms a future contributor could identify where to put a new E2E test and what conventions to follow.
- Human confirms negative-space exclusions remain unchanged.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Run `npm run test` to ensure the existing domain-unit suite still passes.

### Integration Tests:

- No new integration tests are added by this refresh.

### E2E Tests:

- Run `npm run test:e2e` to verify the documented Playwright patterns still pass.
- Run `npm run test:pre-push` to verify the local hook command remains accurate.

### Manual Testing Steps:

1. Read §4 and confirm the stack table reflects actual repo tools.
2. Read §5/§6.5 and confirm local hooks are described accurately without claiming CI E2E.
3. Read §2/§3 and confirm observation-driven queue ordering is visible as the next UI risk gap.
4. Read §6 and confirm the E2E cookbook is actionable.

## Performance Considerations

No runtime performance changes. The refreshed plan should acknowledge that E2E is slower and should remain limited to risk-tied smoke tests rather than broad page coverage.

## Migration Notes

No data or code migration. This is a documentation/planning refresh only.

## References

- Change notes: `context/changes/test-plan-refresh-2026-06-15/change.md`
- Current test plan: `context/foundation/test-plan.md`
- E2E seed pattern: `e2e/seed.spec.ts`
- Priority queue E2E pattern: `e2e/priority-queue.spec.ts`
- Existing lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Refresh stack and quality gates

#### Automated

- [x] 1.1 `npm run test:pre-push` passes after the documentation refresh
- [x] 1.2 `context/foundation/test-plan.md` mentions `npm run test:e2e`, `npm run test:pre-push`, Vitest, and Playwright

#### Manual

- [x] 1.3 Human confirms local pre-push E2E is distinguished from CI-required gates
- [x] 1.4 Human confirms §4 no longer says E2E is absent

### Phase 2: Refresh risk and rollout guidance for observation-driven ordering

#### Automated

- [x] 2.1 The refreshed plan contains a Phase 3 reference to observation-driven queue ordering or observation pressure affecting queue order
- [x] 2.2 The refreshed plan still contains the strategy principle that risks are scenarios, not code locations

#### Manual

- [x] 2.3 Human confirms risk #1 is presented as partially covered, not fully closed
- [x] 2.4 Human confirms the observation-driven queue-ordering gap is visible enough for a future `/10x-e2e` or rollout phase

### Phase 3: Refresh cookbook patterns

#### Automated

- [x] 3.1 `npm run test:e2e` passes after the cookbook refresh
- [x] 3.2 `npm run test` passes after the cookbook refresh
- [x] 3.3 The refreshed cookbook references `e2e/seed.spec.ts` and `e2e/priority-queue.spec.ts`

#### Manual

- [x] 3.4 Human confirms a future contributor could identify where to put a new E2E test and what conventions to follow
- [x] 3.5 Human confirms negative-space exclusions remain unchanged
