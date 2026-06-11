# Testing Priority Foundation Implementation Plan

## Overview

Introduce the project’s first automated test foundation with Vitest, focused on the priority/date domain logic identified as Phase 1 in `context/foundation/test-plan.md`. This plan establishes a low-cost, deterministic unit-test floor before later rollout phases add API/RLS, Worker-runtime, UI smoke, and broader quality-gate coverage.

## Current State Analysis

The project has strong static validation but no automated behavior tests. `package.json` exposes `dev`, `build`, `preview`, `astro`, `lint`, `lint:fix`, and `format`, but no test script. CI currently runs `npm ci`, `npx astro sync`, `npm run lint`, and `npm run build`. The durable test strategy already designates this change as Phase 1: bootstrap the runner and protect the priority/date core first.

## Desired End State

After this plan is complete, the repository has a working Vitest foundation, deterministic priority/date unit tests, CI enforcement for `npm run test`, and updated Phase 1 cookbook guidance in `context/foundation/test-plan.md`. A contributor can run the full handoff gate with `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build`.

### Key Discoveries:

- No automated test runner or test script exists today: `package.json:5-13`.
- Current CI validates install, Astro sync, lint, and build only: `.github/workflows/ci.yml:18-21`.
- Phase 1 in the durable test plan is “Test foundation + priority oracle”: `context/foundation/test-plan.md:70-75`.
- The strongest first test targets are pure TypeScript helpers in `src/lib/garden-beds.ts:162-348`, `src/lib/weed-observations.ts:288-344`, and `src/lib/weeding-events.ts:30-121`.
- Date semantics are a known recurring lesson; future dates must be explicitly accepted or rejected based on field meaning: `context/foundation/lessons.md:5-10`.
- API/RLS and Worker-runtime testing are important but intentionally deferred to later rollout phases.

## What We're NOT Doing

- Not adding Cloudflare Workers Vitest integration in this phase.
- Not adding Supabase CLI/RLS tests in this phase.
- Not adding UI/component/e2e tests in this phase.
- Not adding coverage thresholds or coverage tooling unless implementation discovers Vitest requires it for the chosen scripts.
- Not testing `src/lib/config-status.ts`, because it imports `astro:env/server` and is outside the priority/date oracle.
- Not rewriting production priority logic to make tests pass unless tests expose a real defect.

## Implementation Approach

Use the fast foundation path: add plain Vitest for domain-unit tests, keep tests close to `src/lib/*`, import Vitest APIs explicitly, and pin time in date-sensitive cases with fake timers. Once tests exist and pass locally, add `npm run test` to CI so the new behavior floor is required immediately. Finally, update only the Phase 1 cookbook entries in `context/foundation/test-plan.md`, leaving API/UI patterns as TBD for their own rollout phases.

## Critical Implementation Details

### Timing & lifecycle

Date-dependent tests must pin system time and restore timers after each suite or test. Production helpers use `new Date()` in priority/date and weeding validation paths, so tests that depend on “today” must not rely on the real calendar date or local timezone.

## Phase 1: Bootstrap Vitest Foundation

### Overview

Add the minimal test runner foundation: dependency, scripts, and config needed to run pure TypeScript domain tests with the existing `@/*` import alias.

### Changes Required:

#### 1. Package scripts and dependencies

**File**: `package.json`

**Intent**: Add a standard automated test command and a watch command so agents and humans have one canonical way to run Phase 1 tests.

**Contract**: Add `test` as `vitest run`, `test:watch` as `vitest`, and add `vitest` to `devDependencies`. Keep existing scripts intact.

#### 2. Lockfile update

**File**: `package-lock.json`

**Intent**: Record the installed Vitest dependency graph for reproducible `npm ci` in CI.

**Contract**: Regenerate through npm after adding Vitest; do not hand-edit dependency entries.

#### 3. Vitest configuration

**File**: `vitest.config.ts`

**Intent**: Configure a small Node-based test environment for pure domain tests and mirror the `@/*` alias from `tsconfig.json`.

**Contract**: Include `src/**/*.test.ts` tests, use a Node environment, and map `@` to the local `src` directory. Avoid browser, jsdom, Cloudflare Worker, or Supabase-specific setup in this phase.

### Success Criteria:

#### Automated Verification:

- `npm install --save-dev vitest` or equivalent npm update completes and updates `package.json` plus `package-lock.json`.
- `npm run test` executes successfully, even before substantive tests are added if the runner is checked after config creation.
- `npm run lint` accepts the new config and package changes.

#### Manual Verification:

- Confirm `package.json` exposes `test` and `test:watch` without removing existing scripts.
- Confirm `vitest.config.ts` does not introduce Worker, browser, Supabase, or secret-dependent setup.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Add Priority and Date Oracle Tests

### Overview

Add deterministic unit tests for the Phase 1 risk surface: priority labels, suggested dates, queue ordering, observation pressure, future-date rejection, and mark-weeding date validation.

### Changes Required:

#### 1. Garden priority tests

**File**: `src/lib/garden-beds.test.ts`

**Intent**: Protect the core user-visible priority/date oracle with examples that assert outcomes rather than duplicating the production scoring formula.

**Contract**: Cover `getSuggestedWeedAt`, `getGardenBedPriority`, `toSortedGardenBedQueue`, and `summarizeGardenBedObservationPressure`. Include cases for fixed interval dates, higher urgency sorting before lower urgency, observation pressure influencing suggested date/priority, degraded confidence when inputs are incomplete, and deterministic tie-breaking where relevant.

#### 2. Weed observation validation tests

**File**: `src/lib/weed-observations.test.ts`

**Intent**: Protect date-direction and required-field behavior for weed observations, because observations feed the priority oracle.

**Contract**: Cover `validateCreateWeedObservationInput` for valid past/today dates, future-date rejection, invalid severity, invalid category/stage/coverage, and optional trimmed text behavior if exposed by the public validator.

#### 3. Weeding event validation tests

**File**: `src/lib/weeding-events.test.ts`

**Intent**: Protect mark-weeding date semantics tied to risk #4: a weeding event should not accept future dates or misleading duration/note data.

**Contract**: Cover `validateMarkBedWeededInput` for today/past dates, future-date rejection, invalid date format, non-positive duration, and blank note handling. Use fake timers for today/future boundaries.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes with the new domain-unit suites.
- `npm run lint` passes with explicit Vitest imports and no global test API assumptions.
- `npm run build` still passes after adding tests/config.

#### Manual Verification:

- Review test names and fixtures to confirm they describe product scenarios, not copied implementation formulas.
- Confirm every date-boundary test pins and restores time deterministically.
- Confirm no test fixture contains real Supabase URLs, keys, cookies, or `.dev.vars` content.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Wire CI and Phase 1 Cookbook

### Overview

Make the new test floor required in CI and document the established Phase 1 testing pattern in the durable test plan.

### Changes Required:

#### 1. CI test gate

**File**: `.github/workflows/ci.yml`

**Intent**: Enforce the new behavior test floor on PRs and main pushes immediately after Phase 1 tests exist.

**Contract**: Add `npm run test` after `npm run lint` and before `npm run build`. Keep Supabase secrets scoped to build/deploy as they are today; unit tests should not require secrets.

#### 2. Phase 1 cookbook entries

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the Phase 1 TBD cookbook placeholders with the pattern this change establishes, while leaving Phase 2+ sections for future rollout phases.

**Contract**: Update sections `6.1`, `6.2` only as far as Phase 1 actually ships, and add a concise Phase 1 note under `6.6`. The guidance should name test location, naming pattern, run command, fake-timer rule, and the “product oracle, not formula copy” constraint.

#### 3. Repository guidance consistency check

**File**: `AGENTS.md`

**Intent**: Ensure repository onboarding no longer says not to invent `npm test` in a way that contradicts the new actual script after this phase lands.

**Contract**: If `AGENTS.md` still says no automated test runner exists or says not to run `npm test`, update that narrow guidance to reflect the new test command and keep the existing required handoff commands accurate.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` passes.
- `npm run lint` passes.
- `npm run test` passes.
- `npm run build` passes.
- CI workflow syntax remains valid after adding the test step.

#### Manual Verification:

- Confirm `context/foundation/test-plan.md` updates only shipped Phase 1 patterns and leaves future API/UI cookbook sections scoped to later phases.
- Confirm `AGENTS.md` accurately describes the new test command without expanding scope into unbuilt API/UI tests.
- Confirm the final handoff command list is clear for future agents.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before marking the change complete.

---

## Testing Strategy

### Unit Tests:

- Priority label and score category outcomes for representative low/medium/high urgency beds.
- Suggested next-weeding dates from last-weeding date and weed level.
- Observation pressure impact, including recency, severity, coverage, and risk traits.
- Queue ordering where urgent beds sort before soon/ok beds.
- Date-direction validation for weed observations and weeding events.
- Invalid payload cases for severity, coverage/stage/category, duration, and blank notes.

### Integration Tests:

- No API, Worker-runtime, Supabase, RLS, component, or e2e integration tests are added in this phase.
- The minimum “integration” for Phase 1 is function-level composition inside `src/lib/garden-beds.ts`, such as observation summaries feeding queue items.

### Manual Testing Steps:

1. Run `npm run test` and inspect that test output names product scenarios clearly.
2. Run `npx astro sync`, `npm run lint`, and `npm run build` after tests are added.
3. Confirm no test setup requires Supabase secrets or local `.dev.vars`.
4. Confirm cookbook guidance matches the actual files and commands shipped.

## Performance Considerations

Vitest unit tests should remain fast because they target pure TypeScript helpers and do not boot Astro, Cloudflare Workers, Supabase, or a browser. Avoid adding slow integration setup in this phase.

## Migration Notes

No database or data migration is required. The only process migration is that `npm run test` becomes part of the local and CI validation floor after Phase 3.

## References

- Related research: `context/changes/testing-priority-foundation/research.md`
- Durable quality strategy: `context/foundation/test-plan.md`
- Current scripts: `package.json:5-13`
- Current CI gate: `.github/workflows/ci.yml:18-21`
- Priority/date helpers: `src/lib/garden-beds.ts:162-348`
- Observation validation: `src/lib/weed-observations.ts:288-344`
- Weeding validation: `src/lib/weeding-events.ts:30-121`
- Date lesson: `context/foundation/lessons.md:5-10`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Bootstrap Vitest Foundation

#### Automated

- [x] 1.1 `npm install --save-dev vitest` or equivalent npm update completes and updates `package.json` plus `package-lock.json`. — 1a5d6d0
- [x] 1.2 `npm run test` executes successfully, even before substantive tests are added if the runner is checked after config creation. — 1a5d6d0
- [x] 1.3 `npm run lint` accepts the new config and package changes. — 1a5d6d0

#### Manual

- [x] 1.4 Confirm `package.json` exposes `test` and `test:watch` without removing existing scripts. — 1a5d6d0
- [x] 1.5 Confirm `vitest.config.ts` does not introduce Worker, browser, Supabase, or secret-dependent setup. — 1a5d6d0

### Phase 2: Add Priority and Date Oracle Tests

#### Automated

- [x] 2.1 `npm run test` passes with the new domain-unit suites. — cbfc834
- [x] 2.2 `npm run lint` passes with explicit Vitest imports and no global test API assumptions. — cbfc834
- [x] 2.3 `npm run build` still passes after adding tests/config. — cbfc834

#### Manual

- [x] 2.4 Review test names and fixtures to confirm they describe product scenarios, not copied implementation formulas. — cbfc834
- [x] 2.5 Confirm every date-boundary test pins and restores time deterministically. — cbfc834
- [x] 2.6 Confirm no test fixture contains real Supabase URLs, keys, cookies, or `.dev.vars` content. — cbfc834

### Phase 3: Wire CI and Phase 1 Cookbook

#### Automated

- [x] 3.1 `npx astro sync` passes. — ee2ce50
- [x] 3.2 `npm run lint` passes. — ee2ce50
- [x] 3.3 `npm run test` passes. — ee2ce50
- [x] 3.4 `npm run build` passes. — ee2ce50
- [x] 3.5 CI workflow syntax remains valid after adding the test step. — ee2ce50

#### Manual

- [x] 3.6 Confirm `context/foundation/test-plan.md` updates only shipped Phase 1 patterns and leaves future API/UI cookbook sections scoped to later phases. — ee2ce50
- [x] 3.7 Confirm `AGENTS.md` accurately describes the new test command without expanding scope into unbuilt API/UI tests. — ee2ce50
- [x] 3.8 Confirm the final handoff command list is clear for future agents. — ee2ce50
