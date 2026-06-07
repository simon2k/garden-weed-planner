# Mark Bed Weeded Implementation Plan

## Overview

Implement roadmap S-04: a logged-in user can record that a garden bed was weeded, save how long the work took, optionally add a note, and then see that bed drop in priority. The change closes the queue workflow loop by turning a recommended task into a completed work event that can later support stats and workload predictions.

## Current State Analysis

The app already has a protected `/garden` priority queue with garden beds, plant lists, and weed observations. `public.garden_beds` stores `last_weeded_at` and `weed_level`, and priority is computed in `src/lib/garden-beds.ts`. There is no bed update route, no update RLS policy for `garden_beds`, and no weeding-event history table yet. Weed observations currently contribute to priority based on recency, regardless of whether the bed was weeded after the observation.

## Desired End State

A user can open a bed card, enter a weeding date defaulted to today, enter required duration minutes, optionally add a note, and save the completion event. The server records the event, updates the parent bed's `last_weeded_at`, resets `weed_level` to `low`, and the queue refreshes from the API. Each bed also has an expandable weeding-history section that lazy-loads prior weeding events. Weed observations at or before the latest `last_weeded_at` remain historical but no longer affect current priority.

### Key Discoveries:

- `context/foundation/roadmap.md:112` defines S-04 as marking a bed weeded, saving work time and note, and seeing lower priority.
- `supabase/migrations/20260601120000_create_garden_beds.sql:1` defines the parent bed table but only select/insert RLS policies, so updating `last_weeded_at` requires a new update policy.
- `src/lib/garden-beds.ts:261` computes queue priority from the current bed fields plus observation summaries.
- `src/pages/api/garden/beds.ts:47` loads recent weed observations for all listed beds before sorting the queue.
- `src/components/garden/GardenQueue.tsx:433` and `src/components/garden/GardenQueue.tsx:450` show the existing lazy expandable-section pattern for nested bed resources.
- `context/foundation/lessons.md` requires explicit date-direction semantics; `last_weeded_at` and weeding event dates must reject future dates.

## What We're NOT Doing

- No full edit-bed endpoint or UI.
- No delete/edit behavior for weeding events.
- No generated stats, predictions, charts, or reports yet.
- No deletion or archiving of weed observations.
- No bulk mark-weeding flow.
- No automated test runner setup; verification stays with lint, build, and manual smoke tests.

## Implementation Approach

Use a completion-event model. Add a normalized `garden_bed_weeding_events` child table with per-user RLS. Add a dedicated action endpoint under the bed resource: `PATCH /api/garden/beds/[bedId]/mark-weeded`. The endpoint validates the user-owned bed through Supabase/RLS, inserts a weeding event, updates the parent bed summary fields, and returns an updated decorated queue item. In the queue API and priority helper path, filter observation pressure so observations dated on or before the latest `last_weeded_at` do not keep a freshly weeded bed urgent.

## Critical Implementation Details

### State sequencing

The mark-weeding endpoint must insert the event and update the parent bed as one logical operation from the user's perspective. If the implementation cannot use a database RPC transaction in this slice, it must handle partial failure explicitly: never show UI success unless both the event insert and parent bed update succeeded.

### User experience spec

The mark-weeding form date defaults to today and duration is required. After a successful save, reload the queue from `GET /api/garden/beds` rather than trying to recompute priority locally, and clear the submitted form state for that bed.

## Phase 1: Database Persistence and RLS

### Overview

Create durable weeding-event storage and permit authenticated users to update their own bed summary fields.

### Changes Required:

#### 1. Weeding events migration

**File**: `supabase/migrations/<timestamp>_create_garden_bed_weeding_events.sql`

**Intent**: Persist each completed weeding session for later history, stats, and predictions.

**Contract**: Create `public.garden_bed_weeding_events` with `id uuid primary key default gen_random_uuid()`, `bed_id uuid not null references public.garden_beds(id) on delete cascade`, `user_id uuid not null references auth.users(id) on delete cascade`, `weeded_at date not null`, `duration_minutes integer not null`, `note text`, `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()`. Add constraints for `weeded_at <= current_date`, `duration_minutes > 0`, and `note is null or length(btrim(note)) > 0`.

#### 2. Weeding events indexes

**File**: `supabase/migrations/<timestamp>_create_garden_bed_weeding_events.sql`

**Intent**: Support lazy per-bed history loading and ownership filtering without over-optimizing MVP scale.

**Contract**: Add indexes for `(bed_id, weeded_at desc, created_at desc)` and `(user_id, bed_id)`.

#### 3. Weeding events RLS

**File**: `supabase/migrations/<timestamp>_create_garden_bed_weeding_events.sql`

**Intent**: Ensure users can only select and insert events for their own beds.

**Contract**: Enable RLS. Add authenticated select policy requiring `user_id = auth.uid()`. Add authenticated insert policy requiring `user_id = auth.uid()` and parent bed ownership through an `exists` check against `public.garden_beds`.

#### 4. Bed update policy

**File**: `supabase/migrations/<timestamp>_create_garden_bed_weeding_events.sql`

**Intent**: Allow the mark-weeding endpoint to update owned bed summary fields while preserving per-user isolation.

**Contract**: Add an authenticated update policy on `public.garden_beds` with `using (user_id = auth.uid())` and `with check (user_id = auth.uid())`. This policy enables owned-bed updates; the API contract keeps the actual mutation narrow to `last_weeded_at` and `weed_level`.

#### 5. Timestamp trigger

**File**: `supabase/migrations/<timestamp>_create_garden_bed_weeding_events.sql`

**Intent**: Keep event `updated_at` behavior consistent with existing bed child tables.

**Contract**: Add a table-specific trigger function/trigger or safely reuse a compatible function to set `updated_at = now()` before updates.

### Success Criteria:

#### Automated Verification:

- Supabase migration file exists and defines `public.garden_bed_weeding_events` with required columns and constraints.
- Migration enables RLS and includes select/insert policies scoped to the authenticated owner.
- Migration adds an owned-bed update policy for `public.garden_beds`.
- Migration includes indexes for per-bed history listing and ownership filtering.

#### Manual Verification:

- SQL/RLS smoke test confirms a user cannot select or insert weeding events for another user's bed.
- SQL/RLS smoke test confirms future `weeded_at`, zero duration, and blank notes are rejected.
- SQL/RLS smoke test confirms an authenticated user can update their own bed but not another user's bed.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Domain Helpers and Contracts

### Overview

Add typed validation and response mapping for weeding events and mark-weeding requests.

### Changes Required:

#### 1. Weeding event domain module

**File**: `src/lib/weeding-events.ts`

**Intent**: Keep event validation and response shaping out of route handlers, following `src/lib/bed-plants.ts` and `src/lib/weed-observations.ts` patterns.

**Contract**: Export row, response, create-input, insert-payload, and validation-result types. Response mapping must omit `user_id`.

#### 2. Mark-weeding validation

**File**: `src/lib/weeding-events.ts`

**Intent**: Enforce the chosen completion-event contract consistently at the API boundary.

**Contract**: Add `validateMarkBedWeededInput(value: unknown)` requiring `weeded_at` as a valid `YYYY-MM-DD` date that is today or in the past, requiring `duration_minutes` as a positive integer, and accepting optional `note` that becomes `null` when absent and is rejected if only whitespace.

#### 3. Insert and response mappers

**File**: `src/lib/weeding-events.ts`

**Intent**: Ensure `bed_id` and `user_id` remain server-controlled.

**Contract**: Add helpers equivalent to `toWeedingEventInsertPayload(input, bedId, userId)` and `toWeedingEventResponse(row)`. Client payloads must not be able to set `bed_id`, `user_id`, `id`, or timestamps.

### Success Criteria:

#### Automated Verification:

- `src/lib/weeding-events.ts` exports the contracts needed by API routes.
- Validation accepts a valid past/today date with positive duration and optional note.
- Validation rejects future dates, malformed dates, zero/negative/non-integer duration, non-object payloads, invalid JSON-derived shapes, and whitespace-only notes.
- `npm run lint` passes after the module is added.

#### Manual Verification:

- Reviewer confirms date-direction semantics match `last_weeded_at`: past and today are valid; future is invalid.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Mark-Weeded and History APIs

### Overview

Expose authenticated bed-scoped endpoints for recording a weeding completion and loading prior events.

### Changes Required:

#### 1. Dedicated mark-weeding endpoint

**File**: `src/pages/api/garden/beds/[bedId]/mark-weeded.ts`

**Intent**: Provide a narrow action endpoint instead of broad edit-bed behavior.

**Contract**: Export uppercase `PATCH`. Require configured Supabase and `context.locals.user`. Read the route `bedId`; validate presence but avoid brittle custom UUID validation. Read JSON, validate with `validateMarkBedWeededInput`, insert a `garden_bed_weeding_events` row for the current user and bed, update `garden_beds` for the same bed/user to `last_weeded_at = weeded_at` and `weed_level = 'low'`, then return JSON.

#### 2. Updated queue item response

**File**: `src/pages/api/garden/beds/[bedId]/mark-weeded.ts`

**Intent**: Let the UI confirm the save while still reloading the full queue for authoritative ordering.

**Contract**: After both persistence steps succeed, fetch the updated bed row using the existing garden bed column contract and return `200` JSON as `{ bed: GardenBedQueueItem, event: WeedingEventResponse }`. The returned bed must be decorated with current priority helpers. The UI may still call `loadBeds()` for full ordering.

#### 3. Weeding history endpoint

**File**: `src/pages/api/garden/beds/[bedId]/weeding-events.ts`

**Intent**: Support an expandable per-bed history section without bloating the main queue response.

**Contract**: Export uppercase `GET`. Require configured Supabase and `context.locals.user`. Read the route `bedId`; validate presence; query `garden_bed_weeding_events` for the current `user.id` and `bedId`, ordered by `weeded_at desc, created_at desc`. Return `200` JSON as `{ events: WeedingEventResponse[] }`.

#### 4. Shared JSON/error conventions

**File**: `src/pages/api/garden/beds/[bedId]/mark-weeded.ts`, `src/pages/api/garden/beds/[bedId]/weeding-events.ts`

**Intent**: Keep new routes consistent with existing garden APIs.

**Contract**: Use the same safe JSON response style as `src/pages/api/garden/beds.ts` and nested plants/observations routes. Return `401` for unauthenticated users, `503` for missing Supabase config, `400` for invalid JSON or validation failures, and safe `500` messages for unexpected Supabase failures. Non-owned or missing beds may surface as not found or update/insert failure without leaking ownership.

### Success Criteria:

#### Automated Verification:

- `PATCH /api/garden/beds/[bedId]/mark-weeded` route exists and compiles.
- `GET /api/garden/beds/[bedId]/weeding-events` route exists and compiles.
- API routes import validation/mapping from `src/lib/weeding-events.ts` rather than duplicating validation logic.
- `npm run lint` passes after route additions.

#### Manual Verification:

- Authenticated user can mark their own bed weeded with date, duration, and note.
- Marking a bed inserts an event and updates `garden_beds.last_weeded_at` plus `weed_level = low`.
- Authenticated user can load weeding history for their own bed.
- Authenticated user cannot mark or load history for another user's bed.
- Invalid payloads return safe errors: future date, missing duration, zero duration, malformed JSON.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Priority Reset Semantics

### Overview

Make current priority reflect completed weeding by ignoring weed observations that happened before or on the latest weeding date.

### Changes Required:

#### 1. Observation filtering relative to last weeding

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Prevent old severe observations from keeping a freshly weeded bed urgent.

**Contract**: When building observation summaries for each bed, include only observations whose `observed_at` is after that bed's `last_weeded_at`. Beds without `last_weeded_at` keep the existing recent-observation behavior. Keep observations in the database unchanged.

#### 2. Summary map contract adjustment

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Keep filtering close to the place where bed rows and observation rows are both available.

**Contract**: Adjust `buildObservationSummaryMap` or its call site so it has access to each bed's `last_weeded_at`. Do not move priority calculation into React. Do not mutate source bed rows or observation rows.

#### 3. Mark-weeding decoration consistency

**File**: `src/pages/api/garden/beds/[bedId]/mark-weeded.ts`

**Intent**: Ensure the immediate response and subsequent queue reload agree on priority semantics.

**Contract**: The route may return the updated bed decorated without observation pressure, or it may compute the same post-weeding filtered observation summary. In either case, the UI's authoritative ordering comes from reloading `GET /api/garden/beds`.

### Success Criteria:

#### Automated Verification:

- `GET /api/garden/beds` still returns decorated queue items.
- Observation summaries exclude observations dated on or before a bed's `last_weeded_at`.
- Existing no-observation and no-last-weeded cases still work.
- `npm run lint` passes after priority filtering changes.

#### Manual Verification:

- A bed with a severe observation before the weeding date drops in priority after being marked weeded.
- A weed observation added after the latest weeding date still affects priority.
- Existing plant and observation sections still load and display historical data.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Garden Queue UI

### Overview

Add the mark-weeding form and expandable weeding-history section to each queue card.

### Changes Required:

#### 1. Client response and form types

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Model weeding events and per-bed UI state locally, consistent with plant and observation state.

**Contract**: Add a `WeedingEvent` response type and a per-bed state type with `events`, `isLoading`, `isSubmitting`, `error`, `successMessage`, `form`, `fieldErrors`, and `hasLoaded`. Form fields are `weeded_at`, `duration_minutes`, and `note`, with `weeded_at` defaulted to today.

#### 2. Mark-weeding handlers

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Let users record completed work from a bed card and refresh the queue afterward.

**Contract**: Add handlers to update mark-weeding fields, validate `weeded_at` as past/today, require positive integer `duration_minutes`, reject whitespace-only note, submit JSON to `PATCH /api/garden/beds/${bed.id}/mark-weeded`, clear the form on success, update or reload that bed's history state, and call `loadBeds()` after success.

#### 3. Queue card action wiring

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Place the mark-weeding action where the user decides work is done.

**Contract**: Add mark-weeding controls on each queue card near the existing observations/plants buttons. The action uses the selected date defaulted to today, required duration, optional note, and a submit button with loading state.

#### 4. Expandable weeding history section

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Show saved completion events without crowding the main queue card.

**Contract**: Add a separate expandable “Weeding history” section for each bed. When opened for the first time, fetch `GET /api/garden/beds/${bed.id}/weeding-events`. Render loading, empty, error, retry, and loaded states. Each event displays date, duration in minutes, and note when present.

#### 5. User-facing feedback

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Make saves and validation failures understandable.

**Contract**: Show field-level errors for invalid date/duration/note. Show a success message such as “Weeding recorded — queue refreshed.” Do not show success if either persistence step failed server-side.

### Success Criteria:

#### Automated Verification:

- Garden React island compiles with the new event and form types.
- Client validation rejects future dates, blank/malformed dates, missing duration, zero/negative/non-integer duration, and whitespace-only notes.
- UI fetches `PATCH /api/garden/beds/${bed.id}/mark-weeded` and `GET /api/garden/beds/${bed.id}/weeding-events` with expected payload/response shapes.
- `npm run lint` passes after UI changes.

#### Manual Verification:

- User can mark a bed weeded from its queue card with today's default date, required duration, and optional note.
- After save, the queue reloads and the bed shows lower priority behavior.
- User can expand “Weeding history” and see the recorded event.
- User can collapse and re-expand history without losing already loaded events unexpectedly.
- Existing add-bed, plant-list, and weed-observation flows still work.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 6: Final Verification and Workflow Artifacts

### Overview

Run the repository handoff gates and update the change artifacts for implementation/review.

### Changes Required:

#### 1. Astro sync

**File**: generated Astro metadata, if changed by the command

**Intent**: Keep Astro-generated types aligned after route additions.

**Contract**: Run `npx astro sync`.

#### 2. Lint and build

**File**: N/A

**Intent**: Verify the app compiles and satisfies repository quality gates.

**Contract**: Run `npm run lint` and `npm run build`.

#### 3. Manual smoke notes

**File**: `context/changes/mark-bed-weeded/change.md`

**Intent**: Preserve implementation caveats or manual verification notes without changing the plan progress contract.

**Contract**: Add concise notes only if implementation discovers caveats worth preserving. Do not write to `context/archive/`.

#### 4. Progress updates

**File**: `context/changes/mark-bed-weeded/plan.md`

**Intent**: Keep implementation status machine-readable for `/10x-implement` and `/10x-impl-review`.

**Contract**: Mark completed checks only in `## Progress`, appending commit SHAs after implementation commits when available. Do not rename progress step titles.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` completes successfully.
- `npm run lint` completes successfully.
- `npm run build` completes successfully.
- `context/changes/mark-bed-weeded/plan.md` and `plan-brief.md` both exist.

#### Manual Verification:

- Authenticated end-to-end mark-weeding flow works from `/garden`.
- Weeding history loads for a bed and includes duration and note.
- Priority drops after marking weeded, and pre-weeding observations no longer affect current priority.
- Another user's bed cannot be marked or viewed through the history endpoint.
- Existing add-bed, plant-list, and weed-observation flows still work.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to review.

---

## Testing Strategy

### Unit Tests:

- No test runner exists yet, so do not invent `npm test`.
- If tests are added later, prioritize `validateMarkBedWeededInput` for date direction, duration positivity/integer rules, and note trimming.
- If tests are added later, cover observation filtering relative to `last_weeded_at`.

### Integration Tests:

- Use API smoke tests against local or target Supabase for own-bed mark, non-owned-bed mark, history list, invalid payloads, and RLS constraints.
- Verify `GET /api/garden/beds` queue ordering and priority after mark-weeding.

### Manual Testing Steps:

1. Sign in and open `/garden`.
2. Add or use a bed with high weed level and priority-affecting inputs.
3. Add a severe weed observation dated before the planned weeding date.
4. Mark the bed weeded with today's default date, a positive duration, and a note.
5. Confirm the queue reloads, `weed_level` effectively behaves as low, and priority/suggested date drop.
6. Expand “Weeding history” and confirm the event date, duration, and note appear.
7. Add a new weed observation after the weeding date and confirm it affects priority.
8. Try future date, missing duration, zero duration, and whitespace-only note; confirm validation/server errors.
9. Confirm another user's bed ID cannot be marked or listed through history endpoints.
10. Smoke test existing add-bed, plant-list, and weed-observation sections.

## Performance Considerations

MVP scale is small. Lazy-loading weeding history per expanded bed avoids bloating the main queue payload and follows the existing plants/observations pattern. The per-bed/date index is sufficient for expected history list sizes.

## Migration Notes

This change adds a new child table and an update policy on `garden_beds`. During development before real data exists, rollback can drop `public.garden_bed_weeding_events` and the new policy. After real event data exists, prefer forward migrations over dropping history. If event insert succeeds but bed update fails during implementation, investigate whether an RPC transaction is warranted before shipping.

## References

- Roadmap S-04: `context/foundation/roadmap.md:112`
- Existing bed schema: `supabase/migrations/20260601120000_create_garden_beds.sql:1`
- Existing priority helpers: `src/lib/garden-beds.ts:261`
- Existing garden beds API: `src/pages/api/garden/beds.ts:20`
- Existing lazy nested UI pattern: `src/components/garden/GardenQueue.tsx:433`
- Existing observation reset question: `context/changes/weed-observations-priority/research.md:320`
- Date semantics lesson: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Persistence and RLS

#### Automated

- [x] 1.1 Supabase migration file exists and defines `public.garden_bed_weeding_events` with required columns and constraints. — 6c390f8
- [x] 1.2 Migration enables RLS and includes select/insert policies scoped to the authenticated owner. — 6c390f8
- [x] 1.3 Migration adds an owned-bed update policy for `public.garden_beds`. — 6c390f8
- [x] 1.4 Migration includes indexes for per-bed history listing and ownership filtering. — 6c390f8

#### Manual

- [ ] 1.5 SQL/RLS smoke test confirms a user cannot select or insert weeding events for another user's bed.
- [ ] 1.6 SQL/RLS smoke test confirms future `weeded_at`, zero duration, and blank notes are rejected.
- [ ] 1.7 SQL/RLS smoke test confirms an authenticated user can update their own bed but not another user's bed.

### Phase 2: Domain Helpers and Contracts

#### Automated

- [x] 2.1 `src/lib/weeding-events.ts` exports the contracts needed by API routes. — b941dd8
- [x] 2.2 Validation accepts a valid past/today date with positive duration and optional note. — b941dd8
- [x] 2.3 Validation rejects future dates, malformed dates, zero/negative/non-integer duration, non-object payloads, invalid JSON-derived shapes, and whitespace-only notes. — b941dd8
- [x] 2.4 `npm run lint` passes after the module is added. — b941dd8

#### Manual

- [ ] 2.5 Reviewer confirms date-direction semantics match `last_weeded_at`: past and today are valid; future is invalid.

### Phase 3: Mark-Weeded and History APIs

#### Automated

- [x] 3.1 `PATCH /api/garden/beds/[bedId]/mark-weeded` route exists and compiles. — f5cf072
- [x] 3.2 `GET /api/garden/beds/[bedId]/weeding-events` route exists and compiles. — f5cf072
- [x] 3.3 API routes import validation/mapping from `src/lib/weeding-events.ts` rather than duplicating validation logic. — f5cf072
- [x] 3.4 `npm run lint` passes after route additions. — f5cf072

#### Manual

- [ ] 3.5 Authenticated user can mark their own bed weeded with date, duration, and note.
- [ ] 3.6 Marking a bed inserts an event and updates `garden_beds.last_weeded_at` plus `weed_level = low`.
- [ ] 3.7 Authenticated user can load weeding history for their own bed.
- [ ] 3.8 Authenticated user cannot mark or load history for another user's bed.
- [ ] 3.9 Invalid payloads return safe errors: future date, missing duration, zero duration, malformed JSON.

### Phase 4: Priority Reset Semantics

#### Automated

- [x] 4.1 `GET /api/garden/beds` still returns decorated queue items. — d2266fc — d2266fc
- [x] 4.2 Observation summaries exclude observations dated on or before a bed's `last_weeded_at`. — d2266fc — d2266fc
- [x] 4.3 Existing no-observation and no-last-weeded cases still work. — d2266fc — d2266fc
- [x] 4.4 `npm run lint` passes after priority filtering changes. — d2266fc — d2266fc

#### Manual

- [ ] 4.5 A bed with a severe observation before the weeding date drops in priority after being marked weeded.
- [ ] 4.6 A weed observation added after the latest weeding date still affects priority.
- [ ] 4.7 Existing plant and observation sections still load and display historical data.

### Phase 5: Garden Queue UI

#### Automated

- [x] 5.1 Garden React island compiles with the new event and form types.
- [x] 5.2 Client validation rejects future dates, blank/malformed dates, missing duration, zero/negative/non-integer duration, and whitespace-only notes.
- [x] 5.3 UI fetches `PATCH /api/garden/beds/${bed.id}/mark-weeded` and `GET /api/garden/beds/${bed.id}/weeding-events` with expected payload/response shapes.
- [x] 5.4 `npm run lint` passes after UI changes.

#### Manual

- [ ] 5.5 User can mark a bed weeded from its queue card with today's default date, required duration, and optional note.
- [ ] 5.6 After save, the queue reloads and the bed shows lower priority behavior.
- [ ] 5.7 User can expand “Weeding history” and see the recorded event.
- [ ] 5.8 User can collapse and re-expand history without losing already loaded events unexpectedly.
- [ ] 5.9 Existing add-bed, plant-list, and weed-observation flows still work.

### Phase 6: Final Verification and Workflow Artifacts

#### Automated

- [ ] 6.1 `npx astro sync` completes successfully.
- [ ] 6.2 `npm run lint` completes successfully.
- [ ] 6.3 `npm run build` completes successfully.
- [ ] 6.4 `context/changes/mark-bed-weeded/plan.md` and `plan-brief.md` both exist.

#### Manual

- [ ] 6.5 Authenticated end-to-end mark-weeding flow works from `/garden`.
- [ ] 6.6 Weeding history loads for a bed and includes duration and note.
- [ ] 6.7 Priority drops after marking weeded, and pre-weeding observations no longer affect current priority.
- [ ] 6.8 Another user's bed cannot be marked or viewed through the history endpoint.
- [ ] 6.9 Existing add-bed, plant-list, and weed-observation flows still work.
