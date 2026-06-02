# Priority Bed Queue Implementation Plan

## Overview

Implement S-01 from `context/foundation/roadmap.md`: the first user-visible garden workflow where a logged-in user can add garden beds and see a priority-sorted queue. The queue computes `OK`, `wkrótce`, or `pilne`, shows a suggested next-weeding date, and indicates when incomplete input data lowers confidence.

## Current State Analysis

F-01 is implemented and verified. The database already has `public.garden_beds` with user ownership, RLS, and the raw fields S-01 needs: `area_m2`, `last_weeded_at`, `weed_level`, `estimated_minutes`, and `mulch_depth_cm`. The app already exposes authenticated `GET` and `POST /api/garden/beds`, validates create payloads in `src/lib/garden-beds.ts`, and protects `/dashboard` through `PROTECTED_ROUTES` in `src/middleware.ts`. What is missing is the product layer: priority calculation, queue sorting, suggested date behavior, a protected garden UI route, and an add-bed UI that converts form strings into JSON numbers before calling the existing API.

## Desired End State

A logged-in user can open `/garden`, add a bed with basic priority inputs, and immediately see it in a queue sorted by urgency. Each queue item shows the bed name, priority label, suggested next-weeding date, key raw inputs, and whether the priority is based on complete or partial data. Anonymous users are redirected to sign in, and one user never sees another user's beds.

### Key Discoveries:

- `src/lib/garden-beds.ts:1` already owns garden bed domain types, validation, insert mapping, and response mapping.
- `src/pages/api/garden/beds.ts:13` exposes authenticated listing and `src/pages/api/garden/beds.ts:38` exposes authenticated creation.
- `src/pages/api/garden/beds.ts:24` currently sorts by `created_at desc`, so S-01 must replace or post-process this into priority order.
- `supabase/migrations/20260601120000_create_garden_beds.sql:1` defines the existing `garden_beds` table; no S-01 migration is needed if computed fields remain transient.
- `src/middleware.ts:4` currently protects only `/dashboard`; creating `/garden` requires updating `PROTECTED_ROUTES`.
- Auth forms such as `src/components/auth/SignInForm.tsx:43` show the existing React island form pattern, while `src/pages/auth/signin.astro:16` shows the `client:load` mounting pattern.
- `src/components/auth/FormField.tsx:1`, `src/components/auth/ServerError.tsx:1`, and `src/components/ui/button.tsx:1` provide reusable form/error/button conventions.

## What We're NOT Doing

- No database migration for persisted priority, suggested date, or score columns.
- No update/delete bed behavior; S-01 only creates and lists beds.
- No weed observations, plant list, or weeding-history behavior; those remain S-02 through S-04.
- No calendar/task-planner view beyond showing a suggested next-weeding date.
- No generated Supabase types workflow.
- No new automated test runner; verification remains lint/build plus manual smoke checks.
- No team/shared access model.

## Implementation Approach

Keep priority computation in pure TypeScript helpers in `src/lib/garden-beds.ts` so API and UI can share one contract without a migration. Update the existing garden beds API to return queue-ready decorated beds ordered according to the agreed sorting rules. Add a protected `/garden` Astro page and a React island that fetches the decorated list, submits JSON payloads to the existing API, and refreshes the queue after creation.

## Critical Implementation Details

The existing POST API rejects numeric strings, so the React add-bed island must convert optional number inputs from form strings into actual JSON numbers or `null` before submitting. Suggested dates use fixed intervals by weed level, but priority still uses a rule-based score over all available inputs; missing optional inputs should not block creation, only mark the computed output as lower confidence.

## Phase 1: Priority Domain Helpers

### Overview

Extend the garden bed domain module with queue-specific computed contracts: priority labels, fixed suggested-date intervals, confidence, score, decoration, and sorting.

### Changes Required:

#### 1. Queue domain types

**File**: `src/lib/garden-beds.ts`

**Intent**: Keep S-01 business logic beside the existing garden bed domain contract so API and UI use the same definitions.

**Contract**: Export priority label/type constants for `ok`, `soon`, and `urgent`, plus display labels `OK`, `wkrótce`, and `pilne`. Export a queue/decorated response type that extends the existing `GardenBedResponse` with computed `priority`, `priority_label`, `priority_score`, `suggested_weed_at`, and `priority_confidence` fields.

#### 2. Suggested-date helper

**File**: `src/lib/garden-beds.ts`

**Intent**: Provide deterministic suggested next-weeding dates using the planning decision to keep the first slice simple.

**Contract**: Export a helper that derives `suggested_weed_at` from `last_weeded_at` and `weed_level` using fixed intervals by weed level. The contract must document the interval table in code comments or named constants. If `last_weeded_at` is missing, return `null` and let confidence degrade rather than hiding the bed.

#### 3. Priority score and label helper

**File**: `src/lib/garden-beds.ts`

**Intent**: Compute an explainable rule-based urgency score without persisting it.

**Contract**: Export a pure helper that combines days since last weeding, weed level, mulch depth, area, and estimated minutes into a numeric score, then maps that score to `ok`, `soon`, or `urgent`. Missing optional inputs must use safe defaults and contribute to a degraded confidence marker, not a validation failure. If `last_weeded_at` is missing, the helper must add no elapsed-days boost, but weed level, area, estimated minutes, and mulch depth still influence the score.

#### 4. Queue sorting helper

**File**: `src/lib/garden-beds.ts`

**Intent**: Make queue order deterministic and reusable.

**Contract**: Export a sorting/decorating function that orders beds by priority severity first, then suggested date, then weed level severity, then `created_at` as a stable fallback. Missing `suggested_weed_at` values sort after real suggested dates within the same priority bucket, so incomplete beds remain visible but unknown dates do not dominate known-due beds. The function should accept rows or responses and return decorated queue items without mutating the input array.

### Success Criteria:

#### Automated Verification:

- `src/lib/garden-beds.ts` exports queue priority types/constants and a decorated queue response type.
- Suggested-date helper returns fixed intervals by weed level and `null` when `last_weeded_at` is missing.
- Priority helper produces `ok`, `soon`, and `urgent` outputs from representative low/medium/high inputs.
- Queue sorting helper implements priority, suggested date, weed level, and created date tie-breaks.
- `npx astro sync` succeeds.
- `npm run lint` succeeds.

#### Manual Verification:

- Reviewer confirms the interval table and scoring thresholds are documented clearly enough to adjust later.
- Reviewer confirms incomplete optional fields degrade confidence instead of blocking queue display.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Decorated Garden Beds API

### Overview

Update the existing API so the UI receives queue-ready bed data while preserving the F-01 create/list contract and auth behavior.

### Changes Required:

#### 1. GET queue decoration

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Let clients fetch one canonical queue representation instead of reimplementing sorting and priority logic.

**Contract**: After selecting the current user's beds, map rows through the existing response mapper and the new queue decoration/sorting helper. Return `200` JSON as `{ beds: GardenBedQueueItem[] }`, ordered by the queue helper rather than `created_at desc` alone.

#### 2. POST decorated response

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Keep create behavior compatible while returning the same computed shape the queue displays.

**Contract**: Preserve existing authentication, JSON parsing, validation, insert, and safe error behavior. Return `201` JSON as `{ bed: GardenBedQueueItem }` for the created row. Do not accept client-provided computed fields, `id`, or `user_id`.

#### 3. Error response stability

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Give the React island predictable responses for missing config, auth failures, invalid input, and Supabase failures.

**Contract**: Keep the existing status split: `401` unauthenticated, `400` malformed/invalid payload, `503` missing Supabase config, and safe `500` database failures. Response bodies remain JSON with an `error` string.

### Success Criteria:

#### Automated Verification:

- `GET /api/garden/beds` returns decorated queue items rather than raw-only `GardenBedResponse` objects.
- `POST /api/garden/beds` returns a decorated created bed while preserving existing validation and auth checks.
- API code imports queue helpers from `src/lib/garden-beds.ts` rather than duplicating priority logic.
- `npx astro sync` succeeds.
- `npm run lint` succeeds.

#### Manual Verification:

- Logged-in API smoke request creates a bed and receives computed priority/date/confidence fields.
- Logged-in API smoke request lists beds in the same queue order expected by the helper.
- Anonymous `GET` and `POST` requests still return 401 JSON.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Protected `/garden` Page Shell

### Overview

Create the protected route that hosts the first garden workflow and wire it into the existing auth/navigation structure.

### Changes Required:

#### 1. Protected route registration

**File**: `src/middleware.ts`

**Intent**: Prevent anonymous users from accessing the garden queue page.

**Contract**: Add `/garden` to `PROTECTED_ROUTES` while preserving `/dashboard`. Anonymous requests to `/garden` must redirect to `/auth/signin`; API endpoints still keep their own JSON auth checks.

#### 2. Garden page

**File**: `src/pages/garden.astro`

**Intent**: Provide the SSR route shell for the queue UI.

**Contract**: Create a page using `Layout`, existing cosmic/background styling conventions, and the current authenticated user context if needed. Mount the garden queue React island with `client:load`. The page should include a clear title, short description, and enough container structure for the form and queue.

#### 3. Navigation link

**File**: `src/components/Topbar.astro`

**Intent**: Make the new garden workflow discoverable for authenticated users.

**Contract**: Add a `Garden` or `Queue` link to `/garden` for signed-in users. Keep sign-out behavior and existing `/dashboard` link intact. Because `Topbar` is currently only rendered by `Welcome.astro`, Phase 3 must also make authenticated navigation visible from the app flow: either render `Topbar` on `/dashboard` and `/garden`, or move authenticated navigation into a shared shell/layout used by both authenticated pages.

### Success Criteria:

#### Automated Verification:

- `src/pages/garden.astro` exists and imports/mounts the garden queue React island.
- `src/middleware.ts` protects `/garden` as well as `/dashboard`.
- `src/components/Topbar.astro` exposes a signed-in navigation path to `/garden`.
- `npx astro sync` succeeds.
- `npm run lint` succeeds.

#### Manual Verification:

- Anonymous browser navigation to `/garden` redirects to `/auth/signin`.
- Logged-in browser navigation to `/garden` renders the page shell.
- Signed-in navigation shows a working link to `/garden` without breaking dashboard/sign-out links.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: React Add Form and Queue Island

### Overview

Build the interactive island that lets users add beds and see the priority queue update without a full page reload.

### Changes Required:

#### 1. Garden queue island

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Centralize the S-01 interactive experience in one React component.

**Contract**: On load, fetch `GET /api/garden/beds`, display loading/error/empty states, render the queue, and refresh local state after successful creation. The component consumes and displays the decorated API shape rather than recomputing queue order locally.

#### 2. Add-bed form

**File**: `src/components/garden/GardenQueue.tsx` or `src/components/garden/GardenBedForm.tsx`

**Intent**: Let users add beds with the raw inputs needed for the first priority queue.

**Contract**: Include fields for name, weed level, area, last weeded date, estimated minutes, and mulch depth. The form must require `name` and `weed_level`; optional fields may be blank. Before POSTing, convert optional numeric field strings into JSON numbers or `null`, preserve valid date strings or `null`, and submit JSON to `/api/garden/beds`.

#### 3. Queue item display

**File**: `src/components/garden/GardenQueue.tsx` or `src/components/garden/GardenBedQueueItem.tsx`

**Intent**: Show users why each bed appears where it does.

**Contract**: Each item should show bed name, priority display label, suggested next-weeding date or an incomplete-date message, weed level, estimated minutes, area, mulch depth, and confidence status. Use visual emphasis for `pilne`, lighter treatment for `OK`, and a subtle indicator when confidence is degraded by missing fields.

#### 4. Reusable local UI helpers as needed

**File**: `src/components/garden/*` and optionally existing shared UI components

**Intent**: Keep the React island readable without over-generalizing garden-only UI.

**Contract**: Reuse existing `Button`, `ServerError`, `FormField`, and `cn()` patterns where practical. If garden-specific select/date/number fields need different markup, keep those components under `src/components/garden/` rather than changing auth-specific components globally.

### Success Criteria:

#### Automated Verification:

- Garden React island fetches from `GET /api/garden/beds` and submits JSON to `POST /api/garden/beds`.
- Numeric form fields are converted to numbers or `null`, not sent as strings.
- Empty optional fields do not block submission.
- Queue UI handles loading, empty, error, and successful-created states.
- `npx astro sync` succeeds.
- `npm run lint` succeeds.

#### Manual Verification:

- Logged-in user sees an empty-state message before adding beds.
- Logged-in user can add three beds with low, medium, and high weed levels.
- Queue updates after creation without requiring manual browser refresh.
- Queue cards show priority label, suggested date or missing-date message, and confidence state.
- Invalid required input shows a useful client-side or server-backed error.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Verification and Handoff

### Overview

Run the project gates and record the S-01 manual smoke evidence so the next slices can build on the queue confidently.

### Changes Required:

#### 1. Validation gates

**File**: project root / command output

**Intent**: Match repository handoff requirements for app-code changes.

**Contract**: Run `npx astro sync`, `npm run lint`, and `npm run build`. Do not invent `npm test`, because no automated test runner is configured.

#### 2. Manual smoke notes

**File**: `context/changes/priority-bed-queue/change.md`

**Intent**: Make manual verification auditable for future agents.

**Contract**: Record whether the manual smoke path passed: anonymous `/garden` redirect, logged-in `/garden` render, add three beds, verify fixed suggested dates by weed level, verify priority order, verify degraded confidence for missing fields, and verify a second user does not see the first user's beds.

#### 3. Plan progress updates

**File**: `context/changes/priority-bed-queue/plan.md`

**Intent**: Keep implementation status machine-readable and consistent with the 10x workflow.

**Contract**: Update only the `## Progress` checkboxes when phases complete, appending commit SHAs when steps land. Do not rename progress step titles.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` succeeds.
- `npm run lint` succeeds.
- `npm run build` succeeds.
- `context/changes/priority-bed-queue/plan.md` and `plan-brief.md` both exist.

#### Manual Verification:

- Anonymous `/garden` request redirects to `/auth/signin`.
- Logged-in user A can add low, medium, and high weed-level beds and see them sorted by priority.
- Suggested dates follow the fixed interval table for each weed level.
- A bed with missing optional inputs remains visible with degraded confidence.
- Logged-in user B does not see user A's beds.
- Reviewer confirms no S-02 plant list, S-03 weed observations, S-04 weeding-history, or update/delete scope slipped into S-01.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before closing the change.

---

## Testing Strategy

### Unit Tests:

- No automated test runner exists, so this plan does not add unit tests.
- Priority helper behavior should be manually reviewed with representative low/medium/high examples until a test runner is introduced.
- If a test runner is added later, the first candidates are suggested-date intervals, priority threshold mapping, missing-field confidence, and queue sorting tie-breaks.

### Integration Tests:

- Use authenticated browser/API smoke checks rather than service-role checks.
- Verify API-decorated responses after both `GET` and `POST`.
- Verify route protection through browser navigation to `/garden` while anonymous and while signed in.

### Manual Testing Steps:

1. Visit `/garden` while signed out and confirm redirect to `/auth/signin`.
2. Sign in as user A and visit `/garden`.
3. Confirm empty state appears if user A has no beds.
4. Add a low weed-level bed with enough fields to compute a suggested date.
5. Add a medium weed-level bed.
6. Add a high weed-level bed.
7. Confirm queue order follows priority, then suggested date, then weed level, then created date.
8. Confirm suggested dates follow the fixed interval table for low/medium/high weed levels.
9. Add or inspect a bed with missing optional fields and confirm it remains visible with degraded confidence.
10. Sign in as user B and confirm user A's beds are not visible.
11. Run `npx astro sync`, `npm run lint`, and `npm run build` before handoff.

## Performance Considerations

MVP scale is small and low-QPS, so transient TypeScript computation is appropriate. The existing `garden_beds_user_created_at_idx` supports per-user listing; S-01 should avoid adding priority-specific indexes until real usage proves a need. Queue sorting in memory is acceptable for the expected small number of beds per user.

## Migration Notes

No database migration is planned for S-01. Priority, score, confidence, and suggested next-weeding date are computed from existing columns and are not persisted. Rollback can remove the `/garden` page, React island, and API decoration while leaving F-01's `garden_beds` table intact.

## References

- Roadmap S-01: `context/foundation/roadmap.md`
- Product requirements: `context/foundation/prd.md`
- F-01 handoff: `context/changes/user-scoped-garden-records/change.md`
- Existing domain module: `src/lib/garden-beds.ts:1`
- Existing garden API: `src/pages/api/garden/beds.ts:13`
- Protected route middleware: `src/middleware.ts:4`
- Existing React form pattern: `src/components/auth/SignInForm.tsx:43`
- Existing React island mounting: `src/pages/auth/signin.astro:16`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Priority Domain Helpers

#### Automated

- [x] 1.1 `src/lib/garden-beds.ts` exports queue priority types/constants and a decorated queue response type.
- [x] 1.2 Suggested-date helper returns fixed intervals by weed level and `null` when `last_weeded_at` is missing.
- [x] 1.3 Priority helper produces `ok`, `soon`, and `urgent` outputs from representative low/medium/high inputs.
- [x] 1.4 Queue sorting helper implements priority, suggested date, weed level, and created date tie-breaks.
- [x] 1.5 `npx astro sync` succeeds.
- [x] 1.6 `npm run lint` succeeds.

#### Manual

- [x] 1.7 Reviewer confirms the interval table and scoring thresholds are documented clearly enough to adjust later.
- [x] 1.8 Reviewer confirms incomplete optional fields degrade confidence instead of blocking queue display.

### Phase 2: Decorated Garden Beds API

#### Automated

- [ ] 2.1 `GET /api/garden/beds` returns decorated queue items rather than raw-only `GardenBedResponse` objects.
- [ ] 2.2 `POST /api/garden/beds` returns a decorated created bed while preserving existing validation and auth checks.
- [ ] 2.3 API code imports queue helpers from `src/lib/garden-beds.ts` rather than duplicating priority logic.
- [ ] 2.4 `npx astro sync` succeeds.
- [ ] 2.5 `npm run lint` succeeds.

#### Manual

- [ ] 2.6 Logged-in API smoke request creates a bed and receives computed priority/date/confidence fields.
- [ ] 2.7 Logged-in API smoke request lists beds in the same queue order expected by the helper.
- [ ] 2.8 Anonymous `GET` and `POST` requests still return 401 JSON.

### Phase 3: Protected `/garden` Page Shell

#### Automated

- [ ] 3.1 `src/pages/garden.astro` exists and imports/mounts the garden queue React island.
- [ ] 3.2 `src/middleware.ts` protects `/garden` as well as `/dashboard`.
- [ ] 3.3 `src/components/Topbar.astro` exposes a signed-in navigation path to `/garden`.
- [ ] 3.4 `npx astro sync` succeeds.
- [ ] 3.5 `npm run lint` succeeds.

#### Manual

- [ ] 3.6 Anonymous browser navigation to `/garden` redirects to `/auth/signin`.
- [ ] 3.7 Logged-in browser navigation to `/garden` renders the page shell.
- [ ] 3.8 Signed-in navigation shows a working link to `/garden` without breaking dashboard/sign-out links.

### Phase 4: React Add Form and Queue Island

#### Automated

- [ ] 4.1 Garden React island fetches from `GET /api/garden/beds` and submits JSON to `POST /api/garden/beds`.
- [ ] 4.2 Numeric form fields are converted to numbers or `null`, not sent as strings.
- [ ] 4.3 Empty optional fields do not block submission.
- [ ] 4.4 Queue UI handles loading, empty, error, and successful-created states.
- [ ] 4.5 `npx astro sync` succeeds.
- [ ] 4.6 `npm run lint` succeeds.

#### Manual

- [ ] 4.7 Logged-in user sees an empty-state message before adding beds.
- [ ] 4.8 Logged-in user can add three beds with low, medium, and high weed levels.
- [ ] 4.9 Queue updates after creation without requiring manual browser refresh.
- [ ] 4.10 Queue cards show priority label, suggested date or missing-date message, and confidence state.
- [ ] 4.11 Invalid required input shows a useful client-side or server-backed error.

### Phase 5: Verification and Handoff

#### Automated

- [ ] 5.1 `npx astro sync` succeeds.
- [ ] 5.2 `npm run lint` succeeds.
- [ ] 5.3 `npm run build` succeeds.
- [ ] 5.4 `context/changes/priority-bed-queue/plan.md` and `plan-brief.md` both exist.

#### Manual

- [ ] 5.5 Anonymous `/garden` request redirects to `/auth/signin`.
- [ ] 5.6 Logged-in user A can add low, medium, and high weed-level beds and see them sorted by priority.
- [ ] 5.7 Suggested dates follow the fixed interval table for each weed level.
- [ ] 5.8 A bed with missing optional inputs remains visible with degraded confidence.
- [ ] 5.9 Logged-in user B does not see user A's beds.
- [ ] 5.10 Reviewer confirms no S-02 plant list, S-03 weed observations, S-04 weeding-history, or update/delete scope slipped into S-01.
