# Introduce Development Gates Implementation Plan

## Overview

Configure local Husky development gates so routine quality checks run before commits and pushes. The plan keeps the existing Husky + lint-staged setup, adds staged related tests to pre-commit, and adds unit tests to pre-push without migrating to Lefthook.

## Current State Analysis

The repository already has basic local and CI quality gates, but local Git hooks only run staged lint/format through lint-staged. There is no pre-push hook, and the proposed typecheck command is not currently safe to add as a blocking gate because `npx tsc --noEmit` fails on existing TypeScript errors.

Current hook and quality-gate facts:

- `.husky/pre-commit` runs only `npx lint-staged`: `.husky/pre-commit:1`.
- `package.json` includes `husky` and `lint-staged`: `package.json:50-51`.
- `lint-staged` already runs `eslint --fix` for `*.{ts,tsx,astro}` and Prettier for `*.{json,css,md}`: `package.json:64-70`.
- `npm run test` exists and runs the Vitest unit suite: `package.json:13`.
- Vitest is scoped to Node-based `src/**/*.test.ts` tests with globals disabled: `vitest.config.ts:11-15`.
- CI already runs `npm ci`, `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build`: `.github/workflows/ci.yml:18-22`.
- Project guidance requires handoff checks `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build`: `AGENTS.md:7-9`.
- Research verified `npx tsc --noEmit` currently fails at `src/components/garden/GardenQueue.tsx:561` and `src/lib/garden-beds.ts:316`, so typecheck is deferred for this change.

## Desired End State

After this plan is complete, Husky provides two local development gates:

1. **Pre-commit** keeps the existing lint-staged lint/format behavior and additionally runs Vitest related tests for staged source TypeScript/TSX files.
2. **Pre-push** runs the full unit test suite with `npm run test`.

The gate behavior is documented in repository guidance and the durable test-plan cookbook. Typecheck, Stryker, API/Worker/Supabase/UI/e2e tests remain outside this local hook rollout.

### Key Discoveries:

- Husky is already installed and wired through `.husky/pre-commit`; no new hook runner is needed.
- Existing lint-staged behavior should be preserved because it already covers `.astro` linting and Prettier for JSON/CSS/Markdown.
- `vitest related` can target changed source files, but staged-file filtering should avoid passing package/docs/config files because research found surprising behavior for non-source inputs.
- Pre-push unit tests are straightforward because `npm run test` is already valid.
- `npx tsc --noEmit` is currently red, so adding it to a blocking hook would immediately break normal commits.

## What We're NOT Doing

- Not installing or migrating to Lefthook.
- Not removing Husky or lint-staged.
- Not adding `npx tsc --noEmit` or `astro check` as a blocking hook in this change.
- Not fixing the existing TypeScript errors discovered by `npx tsc --noEmit`.
- Not making Stryker a required gate.
- Not adding Cloudflare Worker, Supabase/RLS, API integration, UI smoke, component, or e2e tests.
- Not moving the full build gate into pre-push; build remains a manual handoff and CI gate.

## Implementation Approach

Keep the local hook layer fast and incremental. Add reusable npm scripts for hook behavior so commands can be run manually outside Git hooks, then wire Husky to those scripts. Preserve `npx lint-staged` as the first pre-commit step, then run staged related tests only when staged source files exist. Add a simple pre-push hook that runs `npm run test`.

## Critical Implementation Details

### Staged-file filtering

Husky shell scripts should collect staged files with Git, filter to `src/**/*.{ts,tsx}`, and run `vitest related` only when that filtered list is non-empty. If no matching staged source files exist, the related-test script should exit successfully without invoking Vitest.

### Typecheck deferral

Do not add `npx tsc --noEmit` to either hook in this change. Research verified it currently fails, so typechecking requires a separate fix and policy decision before becoming a local gate.

## Phase 1: Add Hook Runner Scripts

### Overview

Add reusable npm scripts that express the hook gates in package.json, keeping Husky files thin and making the behavior easy to run manually.

### Changes Required:

#### 1. Pre-commit related test script

**File**: `package.json`

**Intent**: Add a script that runs Vitest related tests for staged `src/**/*.{ts,tsx}` files only. This gives pre-commit fast, relevant feedback without running tests for docs, package files, or unrelated config.

**Contract**: Add a package script with a clear name such as `test:related:staged`. The script must inspect staged files, filter to source TypeScript/TSX files under `src/`, no-op successfully when none exist, and run `npx vitest related <filtered files> --run` when matches exist.

#### 2. Pre-push unit test script

**File**: `package.json`

**Intent**: Add a script for the pre-push unit-test gate, even if it initially delegates to `npm run test`, so the hook has a stable named command that can grow later.

**Contract**: Add a package script with a clear name such as `test:pre-push` that runs the current unit suite via `npm run test`.

### Success Criteria:

#### Automated Verification:

- `npm run test:related:staged` exits 0 when no staged source TypeScript/TSX files exist.
- `npm run test:pre-push` runs the unit suite successfully.
- `npm run lint` passes after package script changes.

#### Manual Verification:

- Confirm the new package scripts are readable and runnable without needing to inspect Husky internals.
- Confirm typecheck is not added to package scripts as a required hook gate.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Wire Husky Hooks

### Overview

Update Husky to run the new development gates: lint-staged plus staged related tests before commit, and unit tests before push.

### Changes Required:

#### 1. Pre-commit hook

**File**: `.husky/pre-commit`

**Intent**: Preserve the existing staged lint/format behavior and add staged related tests after lint-staged succeeds.

**Contract**: Keep `npx lint-staged` as part of pre-commit. Add a call to the staged related-test script from Phase 1. The hook should fail the commit if lint-staged or related tests fail.

#### 2. Pre-push hook

**File**: `.husky/pre-push`

**Intent**: Add a unit-test gate before pushing so obvious test regressions are caught before CI.

**Contract**: Create a Husky pre-push hook that runs the pre-push test script from Phase 1. The hook should fail the push if `npm run test` fails.

### Success Criteria:

#### Automated Verification:

- `.husky/pre-commit` exists and runs `npx lint-staged` plus the staged related-test script.
- `.husky/pre-push` exists and runs the pre-push unit-test script.
- `npm run test:related:staged` passes in the current working tree.
- `npm run test:pre-push` passes in the current working tree.
- `npm run lint` passes after hook changes.

#### Manual Verification:

- Confirm a commit with no staged `src/**/*.ts` or `src/**/*.tsx` files does not run unrelated tests.
- Confirm a commit with a staged source TypeScript file runs related tests before allowing commit.
- Confirm `git push --dry-run` or an equivalent safe push check invokes the pre-push unit-test gate, if a remote is available.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Document Development Gates

### Overview

Document the new local hook behavior so future agents and humans understand what runs at pre-commit, pre-push, manual handoff, and CI.

### Changes Required:

#### 1. Repository guidance

**File**: `AGENTS.md`

**Intent**: Describe the local Husky gates without replacing the existing required handoff commands.

**Contract**: Update the Testing & CI or Development Workflow guidance to mention that Husky pre-commit runs lint-staged plus staged related tests, and Husky pre-push runs unit tests. Keep the required handoff command list unchanged: `npx astro sync`, `npm run lint`, `npm run test`, `npm run build`.

#### 2. Test-plan cookbook

**File**: `context/foundation/test-plan.md`

**Intent**: Fill in the quality-gate cookbook section for the local hook layer that now exists.

**Contract**: Update §6.5 to document the local layers shipped by this change: pre-commit staged lint/format plus staged related tests, pre-push unit tests, and CI/manual handoff as the full gate. Explicitly state that typecheck, Stryker, API/UI/e2e, and build-on-push are not required local hook gates yet.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes after documentation changes.
- `npm run test` passes after documentation changes.
- `npx astro sync` passes after documentation changes.
- `npm run build` passes after documentation changes.

#### Manual Verification:

- Confirm `AGENTS.md` clearly distinguishes pre-commit, pre-push, manual handoff, and CI gates.
- Confirm `context/foundation/test-plan.md §6.5` describes only shipped gates and does not imply deferred API/UI/e2e/Stryker/typecheck gates are required.
- Confirm future agents can identify which command to run manually when a hook fails.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before marking the change complete.

---

## Testing Strategy

### Unit Tests:

- No new product unit tests are added by this change.
- Existing unit tests are used to validate the new pre-push gate via `npm run test`.
- Existing related-test behavior is used to validate the pre-commit staged source-file test gate.

### Integration Tests:

- No API, Worker-runtime, Supabase, RLS, UI, component, or e2e integration tests are added.
- Hook behavior is verified by running the npm scripts directly and, where practical, invoking Husky through safe Git operations.

### Manual Testing Steps:

1. Stage no source TypeScript files and confirm `npm run test:related:staged` exits successfully without running unrelated tests.
2. Stage a source TypeScript file such as a `src/lib/*.ts` file and confirm `npm run test:related:staged` runs related Vitest tests.
3. Confirm `.husky/pre-commit` contains lint-staged plus the staged related-test script.
4. Confirm `.husky/pre-push` contains the pre-push unit-test script.
5. Confirm documentation separates local hooks from full manual/CI gates.

## Performance Considerations

Pre-commit should remain fast because lint-staged only processes staged files and related tests run only for staged source TypeScript/TSX files. Pre-push runs the full unit suite, currently 29 tests across three files, which is acceptable for a push-time gate. Build remains outside pre-push to avoid slowing every push and to avoid local environment-specific build failures.

## Migration Notes

This plan keeps Husky and lint-staged. No migration to Lefthook is performed. Existing contributors should not need a new hook runner; they only receive updated Husky scripts in the repository. If hooks are not installed locally, contributors may need to run the existing Husky setup command used by the project environment, but this plan does not introduce a new installation workflow.

## References

- Related research: `context/changes/introduce-development-gates/research.md`
- Current pre-commit hook: `.husky/pre-commit:1`
- Current package scripts and lint-staged config: `package.json:5-14`, `package.json:64-70`
- Current CI gates: `.github/workflows/ci.yml:18-22`
- Current Vitest config: `vitest.config.ts:11-15`
- Required handoff guidance: `AGENTS.md:7-9`
- Quality gate cookbook target: `context/foundation/test-plan.md:144-152`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Add Hook Runner Scripts

#### Automated

- [x] 1.1 `npm run test:related:staged` exits 0 when no staged source TypeScript/TSX files exist. — 709e1d3
- [x] 1.2 `npm run test:pre-push` runs the unit suite successfully. — 709e1d3
- [x] 1.3 `npm run lint` passes after package script changes. — 709e1d3

#### Manual

- [x] 1.4 Confirm the new package scripts are readable and runnable without needing to inspect Husky internals. — 709e1d3
- [x] 1.5 Confirm typecheck is not added to package scripts as a required hook gate. — 709e1d3

### Phase 2: Wire Husky Hooks

#### Automated

- [x] 2.1 `.husky/pre-commit` exists and runs `npx lint-staged` plus the staged related-test script.
- [x] 2.2 `.husky/pre-push` exists and runs the pre-push unit-test script.
- [x] 2.3 `npm run test:related:staged` passes in the current working tree.
- [x] 2.4 `npm run test:pre-push` passes in the current working tree.
- [x] 2.5 `npm run lint` passes after hook changes.

#### Manual

- [x] 2.6 Confirm a commit with no staged `src/**/*.ts` or `src/**/*.tsx` files does not run unrelated tests.
- [x] 2.7 Confirm a commit with a staged source TypeScript file runs related tests before allowing commit.
- [x] 2.8 Confirm `git push --dry-run` or an equivalent safe push check invokes the pre-push unit-test gate, if a remote is available.

### Phase 3: Document Development Gates

#### Automated

- [ ] 3.1 `npm run lint` passes after documentation changes.
- [ ] 3.2 `npm run test` passes after documentation changes.
- [ ] 3.3 `npx astro sync` passes after documentation changes.
- [ ] 3.4 `npm run build` passes after documentation changes.

#### Manual

- [ ] 3.5 Confirm `AGENTS.md` clearly distinguishes pre-commit, pre-push, manual handoff, and CI gates.
- [ ] 3.6 Confirm `context/foundation/test-plan.md §6.5` describes only shipped gates and does not imply deferred API/UI/e2e/Stryker/typecheck gates are required.
- [ ] 3.7 Confirm future agents can identify which command to run manually when a hook fails.
