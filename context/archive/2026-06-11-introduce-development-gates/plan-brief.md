# Introduce Development Gates — Plan Brief

> Full plan: `context/changes/introduce-development-gates/plan.md`
> Research: `context/changes/introduce-development-gates/research.md`

## What & Why

We are adding local Husky development gates so lint/format and tests catch issues before commits and pushes. The goal is to make the existing quality floor harder to skip without expanding into new test layers or migrating hook tools.

## Starting Point

The repo already uses Husky and lint-staged: `.husky/pre-commit` runs `npx lint-staged`, and `package.json` maps staged TS/TSX/Astro files to ESLint plus JSON/CSS/Markdown to Prettier. There is no pre-push hook, and `npx tsc --noEmit` currently fails, so typecheck is not safe as a blocking hook yet.

## Desired End State

Pre-commit runs the existing staged lint/format gate plus related Vitest tests for staged source TypeScript/TSX files. Pre-push runs the current unit suite with `npm run test`. Documentation clearly separates local hooks from the full manual/CI handoff gate.

## Key Decisions Made

| Decision           | Choice                                           | Why                                                                                               | Source          |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------- |
| Hook runner        | Keep Husky                                       | Husky is already installed and wired; user chose not to migrate to Lefthook.                      | Plan            |
| Staged lint/format | Keep lint-staged                                 | Lowest risk and preserves existing `.astro` + Prettier behavior.                                  | Research / Plan |
| Pre-commit tests   | Run related tests for staged `src/**/*.{ts,tsx}` | Matches user correction to test only staged files while avoiding surprising config/docs behavior. | Research / Plan |
| Pre-push tests     | Run `npm run test`                               | Matches “unit for now” requirement and existing Vitest setup.                                     | Research / Plan |
| Typecheck          | Defer                                            | `npx tsc --noEmit` currently fails and would block commits immediately.                           | Research / Plan |

## Scope

**In scope:**

- Add package scripts for staged related tests and pre-push tests.
- Update `.husky/pre-commit` to run lint-staged plus staged related tests.
- Add `.husky/pre-push` to run unit tests.
- Document local hook gates in `AGENTS.md` and `context/foundation/test-plan.md §6.5`.

**Out of scope:**

- Lefthook migration.
- Typecheck gate or fixing existing typecheck errors.
- Stryker as a required gate.
- API/Worker/Supabase/UI/e2e tests.
- Build on pre-push.

## Architecture / Approach

Keep hooks thin and call npm scripts. `package.json` owns reusable gate commands, `.husky/pre-commit` orchestrates staged lint/format plus related tests, and `.husky/pre-push` runs the unit suite. Full handoff and CI remain `astro sync → lint → test → build`.

## Phases at a Glance

| Phase                  | What it delivers                                                       | Key risk                                                                  |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. Hook runner scripts | Reusable npm scripts for staged related tests and pre-push unit tests. | Staged-file filtering must no-op cleanly when no source files are staged. |
| 2. Husky hook wiring   | Pre-commit and pre-push call the new scripts.                          | Hooks must not become too slow or skip existing lint-staged behavior.     |
| 3. Documentation       | AGENTS and test-plan cookbook explain local gate layers.               | Docs must not imply deferred typecheck/API/UI/Stryker gates are required. |

**Prerequisites:** Existing Husky/lint-staged setup and Vitest unit suite.
**Estimated effort:** ~1 focused session across 3 small phases.

## Open Risks & Assumptions

- The staged related-test script needs careful shell quoting for filenames; implementation should verify common staged-file cases.
- If hooks are not installed in a contributor’s local clone, this plan does not introduce a new Husky installation workflow.
- Typecheck remains a known follow-up once current `tsc --noEmit` errors are fixed.

## Success Criteria (Summary)

- Pre-commit keeps lint-staged and runs related tests only for staged source TS/TSX files.
- Pre-push runs `npm run test` successfully.
- Documentation tells future agents which checks run locally versus manual handoff/CI.
