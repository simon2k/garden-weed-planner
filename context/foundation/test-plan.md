# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-17

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents _what
   could fail_ and _why we believe it's likely_ — drawn from documents,
   interview, and codebase _signal_ (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/` only, excluding docs,
context, archive, build output, lockfiles, generated files, and vendored code.
The refresh scan found 28 commits touching `src/` in the last 30 days; strongest
churn signals were `src/pages/api` (19), `src/components/garden` (8),
`src/components/auth` (6), and `src/lib/garden-beds.ts` (4). New E2E and test
configuration commits also touched `e2e/`, `playwright.config.ts`, and
`package.json`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the _evidence that surfaced
this risk_ — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| #   | Risk (failure scenario)                                                                                    | Impact | Likelihood | Source (evidence — not anchor)                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Priority queue or suggested next-weeding date points the user to the wrong bed.                            | High   | High       | PRD success criteria and business logic; roadmap north star; interview Q1; refresh concern about weed-observation pressure; hot-spot dirs `src/pages/api` and `src/components/garden` |
| 2   | Garden APIs reject valid nested operations or hide the real Supabase/ownership failure.                    | Medium | High       | interview Q2 and Q3; lessons on brittle route validation; hot-spot dir `src/pages/api`                                                                                                |
| 3   | One authenticated user can read, mutate, or infer another user's garden records.                           | High   | Medium     | PRD data-isolation guardrails and access-control section; auth stack; hot-spot dir `src/pages/api`                                                                                    |
| 4   | Marking a bed as weeded records misleading history or fails to lower priority.                             | High   | Medium     | PRD FR-008 plus priority requirements; roadmap mark-weeding slice; date-direction lesson                                                                                              |
| 5   | Garden UI drifts from API behavior, causing stale queue state, duplicate submits, or wrong error feedback. | Medium | Medium     | roadmap priority/update flows; shipped E2E seed and priority-queue smoke patterns; hot-spot dir `src/components/garden`                                                               |
| 6   | Supabase secrets or config leak client-side, or missing server config fails silently at build/deploy time. | High   | Low        | AGENTS secret rule; Astro server-only env config; deploy-plan CI and secrets notes                                                                                                    |

### Risk Response Guidance

| Risk | What would prove protection                                                                                                                                                                                                                         | Must challenge                                   | Context `/10x-research` must ground                                                                                                                                        | Likely cheapest layer                                                                        | Anti-pattern to avoid                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| #1   | Independent examples rank beds and suggested dates correctly across last-weeding age, weed level, area, work time, mulch, and observations. Basic queue ordering has E2E coverage; observation-driven queue ordering remains the next proof target. | The current scoring formula is not the oracle.   | Product oracle, accepted inputs, date semantics, persisted priority shape, weed-observation pressure, and API/UI exposure.                                                 | Unit plus minimal integration; one browser smoke where the rendered queue is the risk signal | Copying production calculation into assertions    |
| #2   | Valid nested requests reach the backend boundary, while invalid or unauthorized cases return clear, non-masking failures.                                                                                                                           | Route guards are not ownership checks.           | Request shape, parent/child ownership boundary, Supabase constraint/RLS behavior, and error translation.                                                                   | API integration                                                                              | Over-mocking Supabase or internal helpers         |
| #3   | Two authenticated users cannot cross-read or cross-write parent or child garden resources.                                                                                                                                                          | "Logged in" is not "owns this record."           | Session shape, persisted ownership fields, RLS policy coverage, and child-resource inheritance.                                                                            | RLS/database test or API integration, whichever gives cheaper real signal                    | Happy-path-only auth tests                        |
| #4   | A weeding action persists the event, respects allowed date direction, and causes the bed's priority/date to move down as expected.                                                                                                                  | `200 OK` does not prove state changed correctly. | Event persistence, date validation contract, priority recomputation trigger, and ordering guarantees.                                                                      | Unit plus integration                                                                        | Brittle time/order assumptions                    |
| #5   | Queue and forms handle submit, refresh, duplicate action, and error states without contradicting API outcomes.                                                                                                                                      | Type-checking is not behavior coverage.          | Client/server contract, loading and disabled-state behavior, refresh mechanism, user-visible error mapping, and the E2E conventions already shipped in `e2e/seed.spec.ts`. | Component/integration or one minimal e2e smoke                                               | Broad snapshots without behavioral assertions     |
| #6   | Secrets stay server-only and missing config is caught by build/smoke gates without logging secret values.                                                                                                                                           | Env declaration alone is not proof.              | Astro env access pattern, Worker secret injection, CI env behavior, and local `.dev.vars` policy.                                                                          | Static/build gate plus smoke                                                                 | Putting secrets into fixtures, snapshots, or logs |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| #   | Phase name                          | Goal (one line)                                                                                                                               | Risks covered      | Test types                               | Status      | Change folder                  |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------- | ----------- | ------------------------------ |
| 1   | Test foundation + priority oracle   | Bootstrap the runner and protect the priority/date core first.                                                                                | #1, #4             | unit + minimal integration               | shipped     | testing-priority-foundation    |
| 2   | Garden API ownership and validation | Protect nested API behavior, RLS/ownership, and error translation.                                                                            | #2, #3, #4         | API integration + db/RLS where justified | not started | —                              |
| 3   | Critical garden UI smoke            | Prove the queue and forms do not drift from API behavior, including observation-driven queue ordering when weed observations change pressure. | #1, #5             | component/integration or minimal e2e     | in progress | add-e2es-to-cover-highest-risk |
| 4   | Quality gates and cookbook          | Wire the testing floor into local/CI workflows and document shipped patterns.                                                                 | #6 + cross-cutting | CI gates + cookbook                      | in progress | test-plan-refresh-2026-06-15   |

## 4. Stack

The classic test base for this project. AI-native tools carry a `checked:`
date when introduced; none are recommended for the initial rollout because
classic deterministic tests give better cost × signal for the accepted risks.

| Layer                  | Tool                   | Version   | Notes                                                                                                                                                   |
| ---------------------- | ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unit + integration     | Vitest                 | `^4.1.8`  | Configured as `npm run test`; current deterministic domain tests live in `src/lib/*.test.ts` and avoid Supabase secrets, Worker setup, and browsers.    |
| Worker/API integration | none yet — see Phase 2 | n/a       | Cloudflare Workers Vitest integration remains the likely candidate to verify current API behavior where API-level signal beats pure domain tests.       |
| Supabase/RLS           | Supabase CLI present   | `^2.23.4` | Use database/RLS tests only where they beat API integration on signal or ownership certainty.                                                           |
| e2e                    | Playwright             | `^1.60.0` | Configured as `npm run test:e2e`; current specs live in `e2e/*.spec.ts` and use `playwright/.auth/user.json` storage state. Keep this layer smoke-only. |
| accessibility          | none yet               | n/a       | Not a top rollout risk; avoid expanding scope until behavioral coverage exists.                                                                         |
| AI-native              | none                   | n/a       | Deliberately omitted for v1; do not add vision/model review over deterministic assertions.                                                              |

**Stack grounding tools (current session):**

- Docs: local manifests and existing context were checked; no new external docs were needed for this refresh; checked: 2026-06-16
- Search: local repo search and hot-spot scan; checked: 2026-06-16
- Runtime/browser: Playwright is installed and configured locally; no browser MCP was used; checked: 2026-06-16
- Provider/platform: local Git hooks, package scripts, and existing CI/deploy context; checked: 2026-06-16

Official references previously checked: Astro testing docs, Cloudflare Workers
Vitest integration docs, and Supabase CLI testing/linting docs.

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required after §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is planned.

| Gate                                 | Where                         | Required?                                                               | Catches                                           |
| ------------------------------------ | ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| `npx astro sync`                     | local + CI                    | required now                                                            | generated Astro types/env drift                   |
| `npm run lint`                       | local + CI                    | required now                                                            | type/lint/style regressions                       |
| `npm run test`                       | local + CI                    | required now                                                            | Vitest domain logic regressions                   |
| `npm run build`                      | local + CI                    | required now                                                            | Cloudflare-targeted production build failures     |
| `npm run test:e2e`                   | local                         | required by local pre-push hook; not yet promoted to a CI-required gate | critical browser smoke regressions                |
| `npm run test:pre-push`              | local Husky pre-push          | required locally                                                        | combined unit + Playwright E2E regressions        |
| API ownership/validation integration | local + CI                    | required after §3 Phase 2                                               | nested API, RLS, and error-mapping regressions    |
| critical garden UI smoke             | local now; CI only if planned | required after §3 Phase 3 if selected by research                       | stale queue, duplicate submit, and form/API drift |
| test cookbook update                 | each rollout final sub-phase  | required after each phase                                               | missing instructions for future test additions    |
| pre-prod smoke                       | manual after deploy           | planned after §3 Phase 4                                                | environment-specific auth/config failures         |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section points to the
rollout phase that must establish the pattern.

### 6.1 Adding a unit test for priority/date behavior

Place Phase 1 domain-unit tests next to the helper they protect as `src/lib/*.test.ts` and run them with `npm run test`. Import Vitest APIs explicitly (`describe`, `it`, `expect`, `vi`, `afterEach`) because globals are disabled in `vitest.config.ts`.

For priority/date behavior, assert product scenarios rather than copying the scoring formula: representative beds should produce expected `ok` / `soon` / `urgent` labels, suggested dates, ordering, confidence, and observation-pressure outcomes. Date-boundary tests must pin time with fake timers and restore timers after the suite or test.

### 6.2 Adding an integration test for priority persistence/API exposure

Phase 1 shipped function-level composition tests only: priority/date helpers in `src/lib/garden-beds.ts`, observation validation in `src/lib/weed-observations.ts`, and weeding-event validation in `src/lib/weeding-events.ts`. Do not add Worker, Supabase, browser, or secret-dependent setup to this layer.

API persistence or route-exposure tests are still deferred to §3 Phase 2. Until that phase lands, keep new priority tests in `src/lib/*.test.ts` unless fresh research proves an API-level test is the cheapest truthful signal.

### 6.3 Adding an API ownership or validation test

TBD — see §3 Phase 2 for nested garden API, ownership, RLS, and error-translation patterns.

### 6.4 Adding a UI smoke test for garden queue/forms

Use Playwright only for browser-visible behavior that unit/API tests cannot prove cheaply. Put specs under `e2e/*.spec.ts`, run them with `npm run test:e2e`, and keep each test tied to a risk from this plan in the test name or nearby comment.

Current shipped patterns:

- `e2e/seed.spec.ts` is the plain seed example for risk #5: add a bed through the interface, assert it appears, delete it through the interface, and assert it disappears.
- `e2e/priority-queue.spec.ts` is the risk #1 pattern: create independent beds through the interface, assert the rendered first queue item and suggested date, then clean up through the interface.

Conventions for new E2E specs:

- Prefer `getByRole` as the default selector; fall back to text or filters only when they describe user-visible state better.
- Wait for state, not time: use assertions like `toBeVisible`, `toBeEnabled`, `toHaveValue`, and `toBeHidden` instead of sleeps.
- Generate unique test data with a run id, and clean up only data created by that test.
- Prefer teardown-before-setup for stale E2E data from interrupted runs, then use `try/finally` cleanup inside the test.
- Use the configured `storageState` (`playwright/.auth/user.json`) rather than logging in through every spec.
- For date-sensitive priority assertions, derive dates relative to UTC today and assert display formatting separately enough to avoid tomorrow's run going stale.
- Keep E2E smoke narrow: one scenario per risk signal, no broad screenshots or snapshot tours.

The next Phase 3 gap is a browser test proving weed observations can change pressure and reorder the rendered queue correctly, not just a basic bed-input priority scenario.

### 6.5 Updating quality gates

Local hooks are layered in front of the full handoff/CI gate. Husky pre-commit runs `npx lint-staged` for staged lint/format plus `npm run test:related:staged`, which runs Vitest related tests only for staged `src/**/*.{ts,tsx}` files and no-ops when none are staged.

Husky pre-push runs `npm run test:pre-push`, which currently delegates to `npm run test && npm run test:e2e`. Treat `npm run test:e2e` as a required local pre-push browser smoke, but do not describe it as CI-required until auth/storageState handling is intentionally added to CI. The full app handoff and CI gate remains `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build`.

### 6.6 Per-rollout-phase notes

- **Phase 1 shipped:** Vitest runs pure TypeScript domain tests in Node via `npm run test`, with test files colocated under `src/lib/*.test.ts`.
- **Phase 1 constraint:** date-boundary tests must pin and restore time; priority assertions should encode product-oracle examples, not duplicate implementation formulas.
- **Phase 1 CI gate:** `npm run test` belongs after lint and before build; tests must not require Supabase secrets, Worker runtime setup, browsers, or `.dev.vars`.
- **E2E seed shipped:** `e2e/seed.spec.ts` documents the UI add/delete convention for garden queue smoke tests.
- **Priority queue E2E shipped:** `e2e/priority-queue.spec.ts` covers the basic risk #1 browser smoke with relative dates, role locators, state waits, and UI cleanup.
- **Remaining UI gap:** observation-driven queue ordering still needs a future Phase 3 browser smoke or lower-level proof that matches the rendered user experience.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout interview. Future contributors should
respect these unless the underlying assumption changes.

- **Marketing/static pages** — low product risk compared with garden priority, ownership, and update behavior. Re-evaluate if these pages become conversion-critical or personalized. (Source: Phase 2 interview Q5.)
- **Broad UI snapshots** — likely to churn without proving priority, ownership, or API behavior. Re-evaluate only for stable visual contracts where deterministic diffs add real signal. (Source: Phase 2 interview Q5.)
- **Base UI primitives** — TypeScript, linting, and upstream component behavior are enough signal for now. Re-evaluate if custom behavior is added to primitives. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-17
- Stack versions last verified: 2026-06-17
- AI-native tool references last verified: 2026-06-17
- E2E seed and priority-queue patterns recorded: 2026-06-17

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
