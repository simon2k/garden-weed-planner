---
date: 2026-06-12T00:00:35+02:00
researcher: Codex
git_commit: df0dd05b5b8dc51e565dd352655668947d7cd773
branch: feat/introduce-test-plan
repository: garden-weed-planner
topic: "Introduce Lefthook development gates for pre-commit and pre-push"
tags: [research, codebase, lefthook, git-hooks, quality-gates, vitest, eslint]
status: complete
last_updated: 2026-06-12
last_updated_by: Codex
---

# Research: Introduce Lefthook development gates for pre-commit and pre-push

**Date**: 2026-06-12T00:00:35+02:00
**Researcher**: Codex
**Git Commit**: df0dd05b5b8dc51e565dd352655668947d7cd773
**Branch**: feat/introduce-test-plan
**Repository**: garden-weed-planner

## Research Question

Install <https://lefthook.dev/> and configure minimal development gates:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx,js,jsx}"
      run: npx eslint --fix {staged_files} && git add {staged_files}
    typecheck:
      run: npx tsc --noEmit
    test:
      glob: "*.{ts,tsx}"
      run: npx vitest related {staged_files} --run

pre-push:
  # run tests - unit for now
```

Research how this should fit the current Astro/Vitest/Husky/lint-staged setup, and identify risks before planning implementation.

## Summary

The repo already has a local hook layer, but it is **Husky + lint-staged**, not Lefthook. The current pre-commit behavior is one shell line: `.husky/pre-commit` runs `npx lint-staged`; `package.json` then maps `*.{ts,tsx,astro}` to `eslint --fix` and `*.{json,css,md}` to `prettier --write`. CI already runs the canonical handoff sequence: `npm ci`, `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build`.

Lefthook can replace Husky cleanly, but the proposed raw config needs adjustment before implementation:

1. **Install path**: add `lefthook` as an npm dev dependency and run `npx lefthook install`. Consider a `prepare` script if the team wants hooks auto-installed after `npm install`.
2. **Pre-commit lint**: prefer Lefthook `stage_fixed: true` over hand-written `&& git add {staged_files}`. Lefthook documents `stage_fixed` as the pre-commit way to auto-stage fixed files after a command.
3. **Glob coverage**: the proposed lint glob omits `.astro`, while current lint-staged includes `.astro`. Dropping `.astro` would weaken the existing pre-commit gate.
4. **Typecheck gate**: `npx tsc --noEmit` currently fails in this repo, so it cannot be added as a blocking hook without first fixing type errors or choosing `astro check` as the Astro-native typecheck command.
5. **Related tests**: `vitest related` works for source files with related tests, but raw staged files can produce surprising behavior for non-source/config files. Restrict it to `src/**/*.{ts,tsx}` or use full `npm run test` at pre-push.
6. **Pre-push**: `npm run test` is already valid and is the right “unit for now” gate. Avoid adding build, API, UI, e2e, Worker, Supabase, or Stryker as required gates in this change unless explicitly planned.

Recommended planning stance: **migrate from Husky to Lefthook, but preserve the current fast staged-file behavior first**. Use pre-commit for fast staged checks and pre-push for `npm run test`. Treat typecheck as a separate decision because the proposed `tsc --noEmit` is currently red.

## Detailed Findings

### Current hook system is Husky + lint-staged

- `package.json` has `husky` and `lint-staged` in dev dependencies ([package.json:50-51](../../../package.json#L50-L51)).
- `.husky/pre-commit` runs `npx lint-staged` ([.husky/pre-commit:1](../../../.husky/pre-commit#L1)).
- `package.json` configures lint-staged so `*.{ts,tsx,astro}` runs `eslint --fix`, while `*.{json,css,md}` runs `prettier --write` ([package.json:64-70](../../../package.json#L64-L70)).
- `npm ls lefthook --depth=0` currently returns empty, so Lefthook is not installed yet.

Implication: replacing Husky with Lefthook should either preserve the lint-staged behavior for a low-risk first step or consciously inline those staged globs in `lefthook.yml` and remove `lint-staged` later.

Two viable migration alternatives:

- **Conservative / minimum risk**: install Lefthook and configure `pre-commit` to run `npx lint-staged`, then add `pre-push: npm run test`. This changes the hook runner only.
- **Fuller migration / fewer hook dependencies**: install Lefthook, remove Husky, and move lint-staged globs into `lefthook.yml`. This should include `.astro` and the existing Prettier file set so behavior does not regress.

### Lefthook supports the desired hook model, but stage handling should use `stage_fixed`

Official Lefthook docs describe the lifecycle as: configure `lefthook.yml`, run `lefthook install`, and Lefthook installs scripts into `.git/hooks/` that call `lefthook run <hook-name>` (<https://lefthook.dev/>). The npm package readme documents `npm install lefthook --save-dev` and then `lefthook install` (<https://www.npmjs.com/package/lefthook>).

The proposed command uses:

```yaml
run: npx eslint --fix {staged_files} && git add {staged_files}
```

That will work in simple cases, but Lefthook has a built-in pre-commit option for this. `stage_fixed: true` automatically calls `git add` on fixed files after the command, applying configured `glob` and `exclude` filters (<https://lefthook.dev/configuration/stage_fixed/>). That is safer and clearer than manually restaging every staged file in the shell command.

Recommended shape for inlining staged lint:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx,js,jsx,astro}"
      run: npx eslint --fix {staged_files}
      stage_fixed: true
```

If Prettier behavior should remain equivalent to lint-staged, add a separate command:

```yaml
    format:
      glob: "*.{json,css,md}"
      run: npx prettier --write {staged_files}
      stage_fixed: true
```

### The proposed lint glob would weaken current behavior by omitting `.astro`

The current lint-staged config includes `.astro` files for `eslint --fix` ([package.json:64-66](../../../package.json#L64-L66)). ESLint also includes Astro configs and Astro-specific rules ([eslint.config.js:62-78](../../../eslint.config.js#L62-L78)).

The proposed Lefthook lint glob is only `*.{ts,tsx,js,jsx}`. In an Astro app where pages/components live under `src/pages/*.astro` and Astro lint rules are configured, omitting `.astro` would make the new pre-commit gate weaker than the current Husky/lint-staged gate.

Recommended planning requirement: include `.astro` in the Lefthook lint command or keep `npx lint-staged` during the first migration.

### `npx tsc --noEmit` currently fails and is not Astro-complete

TypeScript is installed ([package.json:56](../../../package.json#L56)), and the project uses Astro strict TS config with generated Astro types and the `@/*` alias in `tsconfig.json`. However, a local verification run of `npx tsc --noEmit` fails today:

- `src/components/garden/GardenQueue.tsx:561` — `WEED_RISK_TRAITS.map((trait) => [trait, entry?.default_risk_traits.includes(trait) ?? false])` produces a `never` argument mismatch ([src/components/garden/GardenQueue.tsx:556-562](../../../src/components/garden/GardenQueue.tsx#L556-L562)).
- `src/lib/garden-beds.ts:316` — `ageDays` is possibly `null` after a filter that TypeScript does not narrow ([src/lib/garden-beds.ts:306-316](../../../src/lib/garden-beds.ts#L306-L316)).

`@astrojs/check` is installed ([package.json:17](../../../package.json#L17)), so an Astro-native typecheck script could be based on `astro check`. Current CI only runs `npx astro sync`, lint, test, and build ([.github/workflows/ci.yml:18-22](../../../.github/workflows/ci.yml#L18-L22)).

Two viable typecheck options:

- **Do not add typecheck yet**: keep this change limited to fast staged lint and pre-push unit tests, matching current CI.
- **Add typecheck deliberately**: first fix the two known type errors, then add a `typecheck` script. Prefer `astro check` for Astro coverage; consider `astro check && tsc --noEmit` only if the team wants stricter plain TypeScript enforcement too.

Do not add `npx tsc --noEmit` as a blocking pre-commit hook while it is red.

### `vitest related` works, but should be restricted to source files

Vitest is installed and configured for Node-based `src/**/*.test.ts` tests ([package.json:13-14](../../../package.json#L13-L14), [package.json:58](../../../package.json#L58), [vitest.config.ts:11-15](../../../vitest.config.ts#L11-L15)). Current tests live in `src/lib/*.test.ts`.

Observed behavior from research:

- `npx vitest related src/lib/garden-beds.ts --run` runs the related garden-bed test and passes.
- `npx vitest related src/pages/index.astro --run` exits successfully with “No test files found.”
- `npx vitest related README.md package.json --run` can run all three test files, which is surprising for non-source staged files.

The proposed pre-commit test command uses `glob: "*.{ts,tsx}"` and raw `{staged_files}`. That is better than no glob, but still broad enough to include test files, config files, and non-`src` TypeScript files. The project test cookbook currently scopes unit tests to `src/lib/*.test.ts` and pure TypeScript helpers ([context/foundation/test-plan.md:124-134](../../foundation/test-plan.md#L124-L134)).

Recommended pre-commit related-test shape:

```yaml
    test:
      glob: "src/**/*.{ts,tsx}"
      run: npx vitest related {staged_files} --run
```

For pre-push, use the full existing unit suite:

```yaml
pre-push:
  commands:
    test:
      run: npm run test
```

### Existing required gates are already documented and should remain the boundary

AGENTS requires handoff checks `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build` ([AGENTS.md:7-9](../../../AGENTS.md#L7-L9)). CI runs the same gate order after `npm ci` ([.github/workflows/ci.yml:18-22](../../../.github/workflows/ci.yml#L18-L22)). The durable test plan lists the same current quality gates and still defers API ownership, UI smoke, and broader cookbook work to future phases ([context/foundation/test-plan.md:101-116](../../foundation/test-plan.md#L101-L116)).

This change should therefore frame itself as “make existing gates easier and harder to skip,” not “add new test layers.” It should not add:

- Cloudflare Workers Vitest integration.
- Supabase/RLS tests.
- UI/component/e2e tests.
- Stryker as a required local or CI gate.
- Secret-dependent tests.

Stryker is already documented as exploratory follow-up tooling, not a required gate, in the completed testing foundation change notes.

### Pre-push should probably run unit tests only, per user request

The user explicitly asked: “For pre-push, run tests - unit for now.” The clean implementation is `pre-push.commands.test.run: npm run test` because that script already maps to `vitest run` ([package.json:13](../../../package.json#L13)).

Do not put `npm run build` into pre-push unless the plan intentionally expands beyond the user’s request. Build remains required before handoff and in CI, but pre-push can stay lightweight.

## Code References

- `package.json:5-14` - Current scripts; no `prepare`, `typecheck`, or Lefthook script exists.
- `package.json:50-51` - Current hook dependencies are Husky and lint-staged.
- `package.json:64-70` - Current lint-staged staged-file behavior to preserve or intentionally replace.
- `.husky/pre-commit:1` - Current pre-commit entrypoint runs `npx lint-staged`.
- `.github/workflows/ci.yml:18-22` - CI gate order: install, Astro sync, lint, test, build.
- `.github/workflows/ci.yml:23-38` - Supabase secrets are scoped to build/deploy, not test.
- `eslint.config.js:14-20` - Type-aware ESLint is enabled via TypeScript ESLint project service.
- `eslint.config.js:62-78` - Astro lint rules/configs are present, so `.astro` should stay in staged lint scope.
- `vitest.config.ts:11-15` - Vitest is Node-only, includes `src/**/*.test.ts`, globals disabled.
- `context/foundation/test-plan.md:124-134` - Phase 1 unit-test cookbook: colocated `src/lib/*.test.ts`, no Worker/Supabase/browser setup.
- `context/foundation/test-plan.md:144-152` - Quality-gate cookbook still needs Phase 4 detail; Phase 1 CI test gate is shipped.
- `src/components/garden/GardenQueue.tsx:556-562` - One current blocker for `npx tsc --noEmit`.
- `src/lib/garden-beds.ts:306-316` - Second current blocker for `npx tsc --noEmit`.

## Architecture Insights

- **Hook layer should be fast-first.** Pre-commit should remain staged-file focused; full build remains handoff/CI, and user-requested pre-push should run unit tests only.
- **Avoid changing two systems at once unless the plan says so.** Replacing Husky with Lefthook and replacing lint-staged globs are separate decisions. A low-risk path wraps `npx lint-staged` first; a dependency-reduction path inlines globs and removes `lint-staged` later.
- **Use Lefthook primitives rather than shell reimplementation.** `stage_fixed: true` is the native mechanism for auto-restaging fixed files in pre-commit; manual `git add {staged_files}` is broader and less precise.
- **Astro typechecking is special.** Plain `tsc --noEmit` is valid TypeScript, but not the whole Astro story and currently fails. If typecheck becomes a development gate, it deserves its own fix step and probably an `astro check` script.
- **Scope stays inside existing test layers.** API ownership, UI smoke, Worker runtime, Supabase/RLS, e2e, and Stryker-as-required-gate remain deferred.

## Historical Context (from prior changes)

- `context/changes/testing-priority-foundation/plan.md` - Established Vitest as a pure domain-unit foundation and explicitly deferred Worker, Supabase/RLS, UI, and e2e testing.
- `context/changes/testing-priority-foundation/research.md` - Found the original absence of a test runner and recommended unit-first priority/date tests before broader layers.
- `context/changes/testing-priority-foundation/reviews/impl-review.md` - Accepted Stryker as exploratory follow-up tooling, not part of the required Phase 1 gate.
- `context/foundation/test-plan.md` - Durable quality strategy now says Phase 1 shipped Vitest domain tests and leaves API/UI cookbook sections as future work.

## Related Research

- `context/changes/testing-priority-foundation/research.md` - Test foundation research that introduced the current `npm run test` gate.
- `context/changes/testing-priority-foundation/reviews/impl-review.md` - Review record clarifying Stryker should not become a required gate without a future policy.

## External References

- Lefthook overview and lifecycle: <https://lefthook.dev/>
- Lefthook npm package installation: <https://www.npmjs.com/package/lefthook>
- Lefthook `stage_fixed`: <https://lefthook.dev/configuration/stage_fixed/>
- Lefthook glob matcher behavior: <https://lefthook.dev/configuration/glob_matcher/>

## Open Questions

1. Should the plan choose a **low-risk migration** that keeps `lint-staged` and uses Lefthook only as the hook runner first, or a **dependency-reduction migration** that replaces Husky and lint-staged in one change?
2. Should typechecking be part of this change? If yes, should the plan fix the current `tsc --noEmit` errors and use `astro check`, plain `tsc --noEmit`, or both?
3. Should `lefthook install` be run via an npm `prepare` script for teammate onboarding, or documented as a one-time setup command?
4. Should `context/foundation/test-plan.md §6.5` be updated in this change to document the exact local hook layers after implementation?
