# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-07

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/` only, excluding docs,
context, archive, build output, lockfiles, generated files, and vendored code.
The scan found 21 commits touching `src/` in the last 30 days; strongest churn
signals were `src/pages/api` (15), `src/components/garden` (6), and
`src/components/auth` (6).

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| 1 | Priority queue or suggested next-weeding date points the user to the wrong bed. | High | High | PRD success criteria and business logic; roadmap north star; interview Q1; hot-spot dirs `src/pages/api` and `src/components/garden` |
| 2 | Garden APIs reject valid nested operations or hide the real Supabase/ownership failure. | Medium | High | interview Q2 and Q3; lessons on brittle route validation; hot-spot dir `src/pages/api` |
| 3 | One authenticated user can read, mutate, or infer another user's garden records. | High | Medium | PRD data-isolation guardrails and access-control section; auth stack; hot-spot dir `src/pages/api` |
| 4 | Marking a bed as weeded records misleading history or fails to lower priority. | High | Medium | PRD FR-008 plus priority requirements; roadmap mark-weeding slice; date-direction lesson |
| 5 | Garden UI drifts from API behavior, causing stale queue state, duplicate submits, or wrong error feedback. | Medium | Medium | roadmap priority/update flows; duplicate-submit lesson from recent history; hot-spot dir `src/components/garden` |
| 6 | Supabase secrets or config leak client-side, or missing server config fails silently at build/deploy time. | High | Low | AGENTS secret rule; Astro server-only env config; deploy-plan CI and secrets notes |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|---|---|---|---|---|---|
| #1 | Independent examples rank beds and suggested dates correctly across last-weeding age, weed level, area, work time, mulch, and observations. | The current scoring formula is not the oracle. | Product oracle, accepted inputs, date semantics, persisted priority shape, and API/UI exposure. | Unit plus minimal integration | Copying production calculation into assertions |
| #2 | Valid nested requests reach the backend boundary, while invalid or unauthorized cases return clear, non-masking failures. | Route guards are not ownership checks. | Request shape, parent/child ownership boundary, Supabase constraint/RLS behavior, and error translation. | API integration | Over-mocking Supabase or internal helpers |
| #3 | Two authenticated users cannot cross-read or cross-write parent or child garden resources. | "Logged in" is not "owns this record." | Session shape, persisted ownership fields, RLS policy coverage, and child-resource inheritance. | RLS/database test or API integration, whichever gives cheaper real signal | Happy-path-only auth tests |
| #4 | A weeding action persists the event, respects allowed date direction, and causes the bed's priority/date to move down as expected. | `200 OK` does not prove state changed correctly. | Event persistence, date validation contract, priority recomputation trigger, and ordering guarantees. | Unit plus integration | Brittle time/order assumptions |
| #5 | Queue and forms handle submit, refresh, duplicate action, and error states without contradicting API outcomes. | Type-checking is not behavior coverage. | Client/server contract, loading and disabled-state behavior, refresh mechanism, and user-visible error mapping. | Component/integration or one minimal e2e smoke | Broad snapshots without behavioral assertions |
| #6 | Secrets stay server-only and missing config is caught by build/smoke gates without logging secret values. | Env declaration alone is not proof. | Astro env access pattern, Worker secret injection, CI env behavior, and local `.dev.vars` policy. | Static/build gate plus smoke | Putting secrets into fixtures, snapshots, or logs |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Test foundation + priority oracle | Bootstrap the runner and protect the priority/date core first. | #1, #4 | unit + minimal integration | not started | — |
| 2 | Garden API ownership and validation | Protect nested API behavior, RLS/ownership, and error translation. | #2, #3, #4 | API integration + db/RLS where justified | not started | — |
| 3 | Critical garden UI smoke | Prove the queue and forms do not drift from API behavior. | #1, #5 | component/integration or minimal e2e | not started | — |
| 4 | Quality gates and cookbook | Wire the testing floor into local/CI workflows and document shipped patterns. | #6 + cross-cutting | CI gates + cookbook | not started | — |

## 4. Stack

The classic test base for this project. AI-native tools carry a `checked:`
date when introduced; none are recommended for the initial rollout because
classic deterministic tests give better cost × signal for the accepted risks.

| Layer | Tool | Version | Notes |
|---|---|---|---|
| unit + integration | none yet — see Phase 1 | n/a | No test config or real test files exist today; Phase 1 should select and install the runner. |
| Worker/API integration | none yet — see Phase 2 | n/a | Cloudflare Workers Vitest integration is the likely candidate to verify current API behavior. |
| Supabase/RLS | Supabase CLI present | `^2.23.4` | Use database/RLS tests only where they beat API integration on signal or ownership certainty. |
| e2e | none yet — see Phase 3 if justified | n/a | Add only a minimal critical-flow smoke if component/API tests cannot catch the UI failure mode cheaply. |
| accessibility | none yet | n/a | Not a top rollout risk; avoid expanding scope until behavioral coverage exists. |
| AI-native | none | n/a | Deliberately omitted for v1; do not add vision/model review over deterministic assertions. |

**Stack grounding tools (current session):**
- Docs: none via MCP — no Context7/framework docs MCP exposed; local manifests and official docs were checked instead; checked: 2026-06-07
- Search: web search — used to find current official Astro, Cloudflare Workers, and Supabase testing docs; checked: 2026-06-07
- Runtime/browser: none — no Playwright/browser MCP exposed; possible future use only if Phase 3 proves e2e is the cheapest signal; checked: 2026-06-07
- Provider/platform: none — no GitHub/Cloudflare/Supabase MCP exposed; quality-gate relevance comes from local CI, deploy-plan, and manifests; checked: 2026-06-07

Official references checked: Astro testing docs, Cloudflare Workers Vitest
integration docs, and Supabase CLI testing/linting docs.

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required after §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is planned.

| Gate | Where | Required? | Catches |
|---|---|---|---|
| `npx astro sync` | local + CI | required now | generated Astro types/env drift |
| `npm run lint` | local + CI | required now | type/lint/style regressions |
| `npm run build` | local + CI | required now | Cloudflare-targeted production build failures |
| unit + priority integration | local + CI | required after §3 Phase 1 | priority/date logic regressions |
| API ownership/validation integration | local + CI | required after §3 Phase 2 | nested API, RLS, and error-mapping regressions |
| critical garden UI smoke | local or CI | required after §3 Phase 3 if selected by research | stale queue, duplicate submit, and form/API drift |
| test cookbook update | each rollout final sub-phase | required after each phase | missing instructions for future test additions |
| pre-prod smoke | manual after deploy | planned after §3 Phase 4 | environment-specific auth/config failures |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section points to the
rollout phase that must establish the pattern.

### 6.1 Adding a unit test for priority/date behavior

TBD — see §3 Phase 1 for the priority queue and suggested-date oracle pattern.

### 6.2 Adding an integration test for priority persistence/API exposure

TBD — see §3 Phase 1 for the minimum integration layer around priority/date behavior.

### 6.3 Adding an API ownership or validation test

TBD — see §3 Phase 2 for nested garden API, ownership, RLS, and error-translation patterns.

### 6.4 Adding a UI smoke test for garden queue/forms

TBD — see §3 Phase 3 for queue refresh, duplicate-submit, and visible-error behavior.

### 6.5 Updating quality gates

TBD — see §3 Phase 4 for wiring new test commands into local handoff and CI without inventing `npm test` before the runner exists.

### 6.6 Per-rollout-phase notes

TBD — each completed rollout phase should append 2–3 lines here with the canonical pattern it shipped and any surprising constraint future agents must respect.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout interview. Future contributors should
respect these unless the underlying assumption changes.

- **Marketing/static pages** — low product risk compared with garden priority, ownership, and update behavior. Re-evaluate if these pages become conversion-critical or personalized. (Source: Phase 2 interview Q5.)
- **Broad UI snapshots** — likely to churn without proving priority, ownership, or API behavior. Re-evaluate only for stable visual contracts where deterministic diffs add real signal. (Source: Phase 2 interview Q5.)
- **Base UI primitives** — TypeScript, linting, and upstream component behavior are enough signal for now. Re-evaluate if custom behavior is added to primitives. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-07
- Stack versions last verified: 2026-06-07
- AI-native tool references last verified: 2026-06-07

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
