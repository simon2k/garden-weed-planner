---
date: 2026-06-07T11:45:40+02:00
researcher: Codex
git_commit: cb475d769989d8ea0a02fdba996a6f674d744c2c
branch: feat/introduce-test-plan
repository: garden-weed-planner
topic: "Testing foundations for priority/date, API ownership, UI smoke, and quality gates"
tags: [research, codebase, testing, priority, api, supabase, astro]
status: complete
last_updated: 2026-06-07
last_updated_by: Codex
---

# Research: Testing foundations for priority/date, API ownership, UI smoke, and quality gates

**Date**: 2026-06-07T11:45:40+02:00
**Researcher**: Codex
**Git Commit**: cb475d769989d8ea0a02fdba996a6f674d744c2c
**Branch**: feat/introduce-test-plan
**Repository**: garden-weed-planner

## Research Question

Inspect current app structure, auth flows, CI gates, and likely test layers so the `testing-priority-foundation` change can plan the first automated testing foundation.

## Summary

The project currently has **no automated test runner** and no `npm test` script. Existing validation is `npx astro sync`, `npm run lint`, and `npm run build`, wired in CI and documented as the current required gate. The strongest testing foundation is therefore:

1. **Classic domain-unit foundation first**: add a runner and protect priority/date behavior in `src/lib/*`, especially garden-bed priority, suggested-date, observation-pressure, and date-validation helpers.
2. **API/Worker/Supabase integration second**: add ownership, RLS, nested route, invalid payload, and mark-weeded state-change coverage once the runner pattern exists.

This matches the existing `context/foundation/test-plan.md`: Phase 1 is “Test foundation + priority oracle,” Phase 2 is “Garden API ownership and validation,” Phase 3 is “Critical garden UI smoke,” and Phase 4 is “Quality gates and cookbook.”

The key caution: tests should not copy the implementation formula as their oracle. They should encode product scenarios: which bed should be urgent, which date should be suggested, whether future dates are rejected, whether marking weeded lowers priority, and whether another user cannot access the data.

## Detailed Findings

### Current tooling and gates

- `package.json` defines `dev`, `build`, `preview`, `astro`, `lint`, `lint:fix`, and `format`; it does not define a test script ([package.json:5-13](../../../package.json#L5-L13)).
- The CI workflow runs `npm ci`, `npx astro sync`, `npm run lint`, and `npm run build` ([.github/workflows/ci.yml:18-21](../../../.github/workflows/ci.yml#L18-L21)). Supabase secrets are only passed to the build and deploy steps ([.github/workflows/ci.yml:22-37](../../../.github/workflows/ci.yml#L22-L37)).
- Type/lint checks are relatively strong: ESLint uses strict type-checked TypeScript config ([eslint.config.js:14-20](../../../eslint.config.js#L14-L20)), React hooks/compiler rules ([eslint.config.js:40-59](../../../eslint.config.js#L40-L59)), and Astro/a11y configs ([eslint.config.js:71-78](../../../eslint.config.js#L71-L78)).
- Astro is configured for SSR on Cloudflare Workers ([astro.config.mjs:10-16](../../../astro.config.mjs#L10-L16)), and Supabase env variables are server-only secrets ([astro.config.mjs:17-21](../../../astro.config.mjs#L17-L21)).

Testing implication: Phase 1 needs to introduce the first test runner/script deliberately; until then, do not assume `npm test` exists.

### Existing test strategy already chooses the rollout order

- The test plan says the cheapest test with real signal wins and warns against unnecessary e2e or model-based review ([context/foundation/test-plan.md:13-18](../../foundation/test-plan.md#L13-L18)).
- Risk #1 is wrong priority queue or suggested date; risk #4 is mark-weeding history/priority reset; these are the natural Phase 1 concerns ([context/foundation/test-plan.md:44-62](../../foundation/test-plan.md#L44-L62)).
- The phased rollout explicitly starts with “Test foundation + priority oracle,” then API ownership/validation, UI smoke, and quality gates/cookbook ([context/foundation/test-plan.md:70-75](../../foundation/test-plan.md#L70-L75)).
- The stack table confirms there is no unit/integration tool yet and that Phase 1 should select/install the runner ([context/foundation/test-plan.md:83-90](../../foundation/test-plan.md#L83-L90)).
- Quality gates are planned to become required after phases land, not before: unit/priority after Phase 1, API ownership after Phase 2, UI smoke after Phase 3 if selected ([context/foundation/test-plan.md:107-116](../../foundation/test-plan.md#L107-L116)).

Testing implication: this research should ground Phase 1; it should not reopen the whole quality strategy unless new facts contradict the plan.

### Product oracle: priority/date behavior

- PRD success criteria require the user to see garden beds ordered by priority OK / soon / urgent ([context/foundation/prd.md:45-53](../../foundation/prd.md#L45-L53)).
- Functional requirements require priority labels, suggested next-weeding date, sorted urgency, and mark-weeded history ([context/foundation/prd.md:67-72](../../foundation/prd.md#L67-L72)).
- Business logic says priority and date depend on last weeding, weed level, area, estimated work time, mulch, and weed observations ([context/foundation/prd.md:79-85](../../foundation/prd.md#L79-L85)).
- Access control requires users to manage only their own garden beds ([context/foundation/prd.md:87-89](../../foundation/prd.md#L87-L89)).

Testing implication: a useful first suite should encode example outcomes around priority/date ordering and reset behavior, not snapshot internal scores only.

### Domain-unit candidates for Phase 1

- `validateCreateGardenBedInput` validates garden-bed payload shape and numeric/date fields ([src/lib/garden-beds.ts:162-214](../../../src/lib/garden-beds.ts#L162-L214)).
- `getSuggestedWeedAt` combines last-weeding date and observation pressure to produce the earliest suggested date ([src/lib/garden-beds.ts:233-259](../../../src/lib/garden-beds.ts#L233-L259)).
- `getGardenBedPriority`, `toGardenBedQueueItem`, and `toSortedGardenBedQueue` produce user-visible priority, labels, confidence, observation metadata, and ordering ([src/lib/garden-beds.ts:261-298](../../../src/lib/garden-beds.ts#L261-L298)).
- `summarizeGardenBedObservationPressure` applies recency, severity, coverage, growth stage, and repeat-observation pressure ([src/lib/garden-beds.ts:300-334](../../../src/lib/garden-beds.ts#L300-L334)).
- `calculatePriorityScore` combines weed level, elapsed days, area, time, mulch, and observation pressure ([src/lib/garden-beds.ts:336-348](../../../src/lib/garden-beds.ts#L336-L348)).
- `validateCreateWeedObservationInput` rejects future observation dates and validates observation dimensions ([src/lib/weed-observations.ts:288-344](../../../src/lib/weed-observations.ts#L288-L344)).

Testing implication: these are low-cost, high-signal targets for a unit runner because they are mostly pure TypeScript and encode the core product oracle.

### Auth and protected-route boundary

- Protected routes are hardcoded as `/dashboard` and `/garden` ([src/middleware.ts:4](../../../src/middleware.ts#L4)).
- Middleware creates a Supabase client, loads the user into `context.locals.user`, and redirects unauthenticated users away from protected paths ([src/middleware.ts:7-20](../../../src/middleware.ts#L7-L20)).
- `/dashboard` and `/garden` render against `Astro.locals.user` ([src/pages/dashboard.astro:5-23](../../../src/pages/dashboard.astro#L5-L23), [src/pages/garden.astro:6-28](../../../src/pages/garden.astro#L6-L28)).
- Auth pages read `?error=` and hydrate React forms with `client:load` ([src/pages/auth/signin.astro:5-16](../../../src/pages/auth/signin.astro#L5-L16), [src/pages/auth/signup.astro:5-16](../../../src/pages/auth/signup.astro#L5-L16)).

Testing implication: protected-route and auth-form smoke tests belong after the core unit foundation unless a planning step decides they are cheaper than API/component coverage for a specific risk.

### API integration candidates for Phase 2

- Garden bed list/create endpoints require Supabase configuration, `context.locals.user`, validation, and user-scoped queries/inserts ([src/pages/api/garden/beds.ts:20-35](../../../src/pages/api/garden/beds.ts#L20-L35), [src/pages/api/garden/beds.ts:65-93](../../../src/pages/api/garden/beds.ts#L65-L93)).
- Nested plants currently validate UUID and verify bed ownership before listing/creating children ([src/pages/api/garden/beds/[bedId]/plants.ts:26-33](../../../src/pages/api/garden/beds/%5BbedId%5D/plants.ts#L26-L33), [src/pages/api/garden/beds/[bedId]/plants.ts:116-132](../../../src/pages/api/garden/beds/%5BbedId%5D/plants.ts#L116-L132)). This intersects with the known lesson against brittle route ID validators.
- Weed observations and weeding events filter by both `bed_id` and `user_id` ([src/pages/api/garden/beds/[bedId]/weed-observations.ts:29-41](../../../src/pages/api/garden/beds/%5BbedId%5D/weed-observations.ts#L29-L41), [src/pages/api/garden/beds/[bedId]/weeding-events.ts:23-35](../../../src/pages/api/garden/beds/%5BbedId%5D/weeding-events.ts#L23-L35)).
- Mark-weeded inserts an event, then updates the bed to `weed_level: "low"` and returns refreshed priority data ([src/pages/api/garden/beds/[bedId]/mark-weeded.ts:36-62](../../../src/pages/api/garden/beds/%5BbedId%5D/mark-weeded.ts#L36-L62)).
- Database migrations enable RLS for garden beds ([supabase/migrations/20260601120000_create_garden_beds.sql:23-35](../../../supabase/migrations/20260601120000_create_garden_beds.sql#L23-L35)) and weeding events ([supabase/migrations/20260607110000_create_garden_bed_weeding_events.sql:22-49](../../../supabase/migrations/20260607110000_create_garden_bed_weeding_events.sql#L22-L49)).

Testing implication: API/RLS tests should use real authenticated contexts where possible. Over-mocking Supabase would hide the ownership and policy failures the tests are meant to catch.

### Garden UI smoke candidates for Phase 3

- `GardenQueue` loads beds on mount ([src/components/garden/GardenQueue.tsx:269-291](../../../src/components/garden/GardenQueue.tsx#L269-L291)).
- It creates beds through `/api/garden/beds` ([src/components/garden/GardenQueue.tsx:307-339](../../../src/components/garden/GardenQueue.tsx#L307-L339)).
- It lists and creates plants ([src/components/garden/GardenQueue.tsx:369-464](../../../src/components/garden/GardenQueue.tsx#L369-L464)).
- It lists and creates weed observations ([src/components/garden/GardenQueue.tsx:506-635](../../../src/components/garden/GardenQueue.tsx#L506-L635)).
- It lists weeding events and marks a bed as weeded ([src/components/garden/GardenQueue.tsx:676-776](../../../src/components/garden/GardenQueue.tsx#L676-L776)).

Testing implication: if Phase 3 is selected, smoke tests should focus on behavior: load/refresh, duplicate-submit prevention, API error display, and queue update after mark-weeded. Broad snapshots are lower signal.

### Secrets and missing config

- `createClient` returns `null` when Supabase env is missing ([src/lib/supabase.ts:5-8](../../../src/lib/supabase.ts#L5-L8)).
- The server client bridges cookies through `@supabase/ssr` ([src/lib/supabase.ts:9-23](../../../src/lib/supabase.ts#L9-L23)).
- `configStatuses` reports missing Supabase config as disabled auth functionality ([src/lib/config-status.ts:11-18](../../../src/lib/config-status.ts#L11-L18)).
- CI/build uses secrets without committing them ([.github/workflows/ci.yml:22-37](../../../.github/workflows/ci.yml#L22-L37)).

Testing implication: fixtures should never include real Supabase keys. Missing-config tests are useful, but secret-leak assertions should be static/build smoke rather than logging or snapshotting env values.

## Code References

- `package.json:5-13` - available npm scripts; no test script.
- `.github/workflows/ci.yml:18-21` - current CI validation commands.
- `astro.config.mjs:10-21` - Cloudflare SSR and server-only Supabase env declaration.
- `src/lib/garden-beds.ts:162-348` - primary unit-test target for garden input validation, priority, suggested dates, ordering, and observation pressure.
- `src/lib/weed-observations.ts:288-344` - observation validation target, including future-date rejection.
- `src/middleware.ts:4-20` - protected route list, auth lookup, and redirect behavior.
- `src/pages/api/garden/beds.ts:20-93` - authenticated garden-bed list/create API.
- `src/pages/api/garden/beds/[bedId]/plants.ts:26-33` - UUID route guard that should be reviewed against the known lesson on brittle validators.
- `src/pages/api/garden/beds/[bedId]/mark-weeded.ts:36-62` - integration target for event insertion plus priority reset.
- `src/components/garden/GardenQueue.tsx:269-776` - UI smoke surface for queue loading, mutations, errors, and refresh behavior.

## Architecture Insights

- The app already separates product logic into `src/lib/*` and wires it through API/page/UI layers. That makes a unit-first testing foundation practical.
- Priority/date behavior is both product-critical and mostly deterministic. It should be covered before broader UI/e2e tests.
- API ownership is a separate layer from route protection: middleware decides whether a user is logged in, while API handlers and RLS decide which records the user owns.
- Supabase and Cloudflare matter for integration tests. Pure domain tests can run in a normal JS runner, but API/Worker tests should respect runtime and auth/session behavior.
- Current quality gates prove buildability and static correctness, not behavior. Test gates should be added only after the corresponding rollout phase establishes a real test command and cookbook pattern.

## Historical Context (from prior changes)

- `context/foundation/test-plan.md:70-75` - freezes the phased rollout: priority foundation first, API ownership second, UI smoke third, gates/cookbook fourth.
- `context/foundation/test-plan.md:83-90` - records that no real test config or test files exist today.
- `context/foundation/lessons.md:5-10` - date direction semantics are a known recurring rule; future dates for “last occurrence” fields should be rejected.
- `context/foundation/lessons.md:12-17` - brittle nested route ID validators can mask Supabase/RLS/ownership failures; this is relevant to nested garden APIs.
- `context/changes/priority-bed-queue/plan.md` - prior work identified priority intervals, thresholds, confidence, and sorting as future test candidates.
- `context/changes/weed-observations-priority/plan.md` - prior work added observation pressure and decay behavior, which should become Phase 1 oracle cases.
- `context/changes/mark-bed-weeded/plan.md` - prior work added reset semantics after weeding, which should be protected by unit plus integration coverage.

## Related Research

No older `research.md` artifacts were found for this exact testing foundation change. The closest related artifact is the durable quality strategy in `context/foundation/test-plan.md`.

## Open Questions

- Which exact runner should Phase 1 select for Astro 6 + React 19 + Cloudflare Workers compatibility?
- Should Phase 1 include only pure unit tests, or also a minimal integration test proving API-exposed priority shape?
- For Phase 2, is Supabase CLI/RLS testing cheaper and more truthful than Worker/API integration for cross-user isolation?
- Should the nested plants UUID guard be changed before testing, or should tests first document the current masking behavior as a known risk?
