# Delete Beds Implementation Plan

## Overview

Add the ability for an authenticated user to delete one garden bed from the `/garden` priority queue. The MVP behavior is a hard delete: deleting the parent `garden_beds` row removes its plants, weed observations, and weeding events through existing database `ON DELETE CASCADE` relationships.

## Current State Analysis

The app already supports creating and listing garden beds on `/garden`, plus child data for plants, weed observations, and weeding history. Garden bed creation/listing lives in `src/pages/api/garden/beds.ts`, and the interactive queue card UI lives in `src/components/garden/GardenQueue.tsx`.

Deleting is currently missing. The database schema already has cascading child relationships, but `garden_beds` does not yet expose an RLS delete policy. Existing route patterns require server-side auth checks through `context.locals.user` and the Supabase SSR client.

## Desired End State

A logged-in user can click a delete action on a bed card, see an inline confirmation state, confirm deletion, and immediately see the bed removed from the queue. The API deletes only beds owned by the current user and returns the same not-found response for missing and not-owned IDs. Related plant, observation, and weeding-event records are deleted by database cascade.

### Key Discoveries:

- `src/pages/api/garden/beds.ts:20-63` lists queue-ready beds for the authenticated user and decorates them with priority/observation data.
- `src/pages/api/garden/beds.ts:65-94` creates garden beds through the existing Supabase client and validation flow.
- `src/components/garden/GardenQueue.tsx:254-267` owns queue, expanded-section, child-resource, and weeding state for each bed.
- `src/components/garden/GardenQueue.tsx:1100-1272` renders each queue card and its plant, observation, and weeding controls.
- `supabase/migrations/20260601120000_create_garden_beds.sql:23-35` enables RLS and adds select/insert policies, but no delete policy.
- `supabase/migrations/20260605130000_create_garden_bed_plants.sql:3`, `supabase/migrations/20260605200000_create_garden_bed_weed_observations.sql:3`, and `supabase/migrations/20260607110000_create_garden_bed_weeding_events.sql:3` already define `bed_id` foreign keys with `on delete cascade`.
- `context/foundation/lessons.md` says nested routes should avoid brittle custom ID validators when database ownership/RLS can enforce existence and ownership.

## What We're NOT Doing

- No soft delete, archive, restore, or undo behavior.
- No bulk deletion.
- No separate delete/edit UI for plants, weed observations, or weeding events.
- No new Supabase/API integration test framework.
- No changes to priority scoring, suggested dates, or mark-weeding behavior.

## Implementation Approach

Use the existing database model as the source of truth. Add the narrowest RLS capability needed: users may delete only their own `garden_beds` rows. Add a REST-shaped `DELETE /api/garden/beds/[bedId]` route that validates auth and bed ID presence, then attempts an owned delete and returns `404` if no row was deleted. In the React island, add inline confirmation state to each bed card and update local state after success instead of reloading the entire queue.

## Critical Implementation Details

### State cleanup

After successful deletion, the UI must remove the bed from `beds` and also clear any state keyed by the deleted bed ID: expanded plants, expanded observations, expanded weeding history, `plantStateByBedId`, `observationStateByBedId`, and `weedingStateByBedId`. Otherwise stale child data can remain in memory and reappear if a future bed somehow reuses the same state path.

### Ownership semantics

The delete API should return `404 Garden bed not found` for both missing and not-owned IDs. This preserves the existing data-isolation posture and avoids leaking whether another user's bed exists.

## Phase 1: Database Delete Policy

### Overview

Allow authenticated users to delete their own garden beds while preserving the existing cascade model for child data.

### Changes Required:

#### 1. Supabase migration

**File**: `supabase/migrations/<timestamp>_allow_users_to_delete_own_garden_beds.sql`

**Intent**: Add the RLS policy required for owned garden-bed deletion. The policy should be scoped to `garden_beds` only and should not alter select/insert/update behavior.

**Contract**: Create a `for delete to authenticated using (user_id = auth.uid())` policy on `public.garden_beds`. Child rows continue to be deleted by their existing `ON DELETE CASCADE` foreign keys.

### Success Criteria:

#### Automated Verification:

- Migration file exists under `supabase/migrations/` with a timestamped name.
- Migration defines a delete policy scoped to authenticated users and `user_id = auth.uid()`.
- `npx astro sync` completes successfully.

#### Manual Verification:

- Reviewer confirms the migration does not add broader table access or alter child-table policies.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Delete Bed API

### Overview

Expose a narrow authenticated endpoint for deleting one owned bed.

### Changes Required:

#### 1. Dedicated bed item route

**File**: `src/pages/api/garden/beds/[bedId].ts`

**Intent**: Add `DELETE /api/garden/beds/[bedId]` without changing the existing collection `GET`/`POST` route. The route should follow existing API response conventions and use the Supabase SSR client.

**Contract**: Export uppercase `DELETE`. Return `503` when Supabase is not configured, `401` when unauthenticated, `400` when the bed ID is absent, `404` when no owned bed is deleted, and success when the owned bed is deleted. Do not use a strict UUID regex gate; validate presence, then rely on the owned delete query and database/RLS behavior.

#### 2. Owned delete query

**File**: `src/pages/api/garden/beds/[bedId].ts`

**Intent**: Delete only the row matching both URL bed ID and current user ID.

**Contract**: The Supabase mutation must target `garden_beds`, filter by `.eq("id", bedId)` and `.eq("user_id", user.id)`, and request enough returned data/count signal to distinguish deleted vs not found. Missing/not-owned rows return `404 Garden bed not found`.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` completes successfully.
- `npm run lint` completes successfully.
- `npm run test` completes successfully.
- `npm run build` completes successfully.

#### Manual Verification:

- Authenticated delete of an owned bed returns success.
- Deleting a missing bed ID returns `404`.
- A not-owned bed cannot be deleted and is surfaced as `404`, not `403` or success.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Garden Queue UI

### Overview

Add an inline destructive-action flow to each bed card and update queue state locally after successful deletion.

### Changes Required:

#### 1. Delete state and handlers

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Track which bed is awaiting delete confirmation and which bed is currently being deleted. Add handlers to open/cancel confirmation and submit the delete request.

**Contract**: Confirmation is card-scoped. The delete submit handler calls `DELETE /api/garden/beds/${bedId}`, handles API errors with the existing error-message pattern, prevents duplicate in-flight deletion for the same bed, and on success removes the bed locally.

#### 2. Per-bed state cleanup

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Prevent stale expanded/child state after a bed is removed.

**Contract**: Successful deletion removes the bed ID from `expandedBedIds`, `expandedObservationBedIds`, and `expandedWeedingHistoryBedIds`, and deletes the bed ID keys from `plantStateByBedId`, `observationStateByBedId`, and `weedingStateByBedId`.

#### 3. Card-level inline confirmation UI

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Add a visible delete affordance that requires a second explicit confirmation before destructive action.

**Contract**: `QueueCard` receives delete-related props. Default state shows a delete button styled as destructive/secondary relative to primary actions. Confirmation state shows clear warning copy that plants, weed observations, and weeding history will also be deleted, plus Cancel and Confirm delete actions. Confirm button shows loading/disabled state while deletion is in flight.

### Success Criteria:

#### Automated Verification:

- `npm run lint` completes successfully.
- `npm run test` completes successfully.
- `npm run build` completes successfully.

#### Manual Verification:

- Clicking delete once does not delete; it reveals inline confirmation on that card.
- Cancel hides the confirmation without changing the queue.
- Confirm deletes the bed, removes the card without a full queue reload, and shows a success message.
- Expanded plant, observation, and weeding-history sections for the deleted bed do not leave stale UI behind.
- The empty queue message still appears when the last bed is deleted.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Verification and Handoff

### Overview

Run the full repository gate and perform the destructive-action smoke checks that automated tests do not currently cover.

### Changes Required:

#### 1. Full validation gate

**File**: Repository commands

**Intent**: Prove app code and config still pass the project handoff gate.

**Contract**: Run `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build` from the repository root.

#### 2. Manual delete smoke

**File**: Manual verification notes in handoff/PR

**Intent**: Verify the real product behavior that currently lacks API/RLS integration tests.

**Contract**: With Supabase configured, create a bed with at least one child record where practical, delete it from `/garden`, verify the bed disappears, verify child data no longer appears through the UI, verify missing/not-owned behavior is non-leaking, and verify the queue remains usable after deletion.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` completes successfully.
- `npm run lint` completes successfully.
- `npm run test` completes successfully.
- `npm run build` completes successfully.

#### Manual Verification:

- Owned bed deletion works from `/garden`.
- Associated plants, weed observations, and weeding events are removed by cascade.
- Missing/not-owned delete attempts do not leak another user's data.
- PR/handoff notes list the validation commands and manual smoke checks performed.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Add focused unit tests only if implementation introduces new pure helpers.
- Do not create fake coverage for Supabase/RLS behavior in domain tests.

### Integration Tests:

- No new API/Supabase integration framework in this change.
- Treat delete route/RLS/cascade behavior as manual smoke coverage for now, consistent with the existing test-plan boundary.

### Manual Testing Steps:

1. Sign in and create a test bed.
2. Add child data where practical: plant, weed observation, and/or weeding event.
3. Click Delete on the bed card and confirm that the first click only opens confirmation.
4. Cancel and verify the bed remains.
5. Delete again, confirm, and verify the bed disappears without a full page reload.
6. Verify the queue summary and empty state update correctly.
7. Verify child data is no longer reachable through the UI after cascade.
8. Attempt a missing/not-owned delete path and confirm the response does not leak ownership details.

## Performance Considerations

Deleting one bed is a low-volume action. Local UI removal avoids an extra queue reload after success. No additional caching or memoization is needed.

## Migration Notes

Add one forward-only Supabase migration for the `garden_beds` delete policy. Existing child foreign keys already define cascade behavior, so no child-table migration is planned.

## References

- Change identity: `context/changes/delete-beds/change.md`
- PRD: `context/foundation/prd.md`
- Roadmap: `context/foundation/roadmap.md`
- Lessons: `context/foundation/lessons.md`
- Existing garden beds API: `src/pages/api/garden/beds.ts`
- Existing queue UI: `src/components/garden/GardenQueue.tsx`
- Garden beds schema/RLS: `supabase/migrations/20260601120000_create_garden_beds.sql`
- Child cascade schemas: `supabase/migrations/20260605130000_create_garden_bed_plants.sql`, `supabase/migrations/20260605200000_create_garden_bed_weed_observations.sql`, `supabase/migrations/20260607110000_create_garden_bed_weeding_events.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Delete Policy

#### Automated

- [x] 1.1 Migration file exists under `supabase/migrations/` with a timestamped name — e86515b
- [x] 1.2 Migration defines a delete policy scoped to authenticated users and `user_id = auth.uid()` — e86515b
- [x] 1.3 `npx astro sync` completes successfully — e86515b

#### Manual

- [x] 1.4 Reviewer confirms the migration does not add broader table access or alter child-table policies — e86515b

### Phase 2: Delete Bed API

#### Automated

- [x] 2.1 `npx astro sync` completes successfully — 5370913
- [x] 2.2 `npm run lint` completes successfully — 5370913
- [x] 2.3 `npm run test` completes successfully — 5370913
- [x] 2.4 `npm run build` completes successfully — 5370913

#### Manual

- [x] 2.5 Authenticated delete of an owned bed returns success — 5370913
- [x] 2.6 Deleting a missing bed ID returns `404` — 5370913
- [x] 2.7 A not-owned bed cannot be deleted and is surfaced as `404`, not `403` or success — 5370913

### Phase 3: Garden Queue UI

#### Automated

- [x] 3.1 `npm run lint` completes successfully — ebb3209
- [x] 3.2 `npm run test` completes successfully — ebb3209
- [x] 3.3 `npm run build` completes successfully — ebb3209

#### Manual

- [x] 3.4 Clicking delete once does not delete; it reveals inline confirmation on that card — ebb3209
- [x] 3.5 Cancel hides the confirmation without changing the queue — ebb3209
- [x] 3.6 Confirm deletes the bed, removes the card without a full queue reload, and shows a success message — ebb3209
- [x] 3.7 Expanded plant, observation, and weeding-history sections for the deleted bed do not leave stale UI behind — ebb3209
- [x] 3.8 The empty queue message still appears when the last bed is deleted — ebb3209

### Phase 4: Verification and Handoff

#### Automated

- [x] 4.1 `npx astro sync` completes successfully — 02300e5
- [x] 4.2 `npm run lint` completes successfully — 02300e5
- [x] 4.3 `npm run test` completes successfully — 02300e5
- [x] 4.4 `npm run build` completes successfully — 02300e5

#### Manual

- [x] 4.5 Owned bed deletion works from `/garden` — 02300e5
- [x] 4.6 Associated plants, weed observations, and weeding events are removed by cascade — 02300e5
- [x] 4.7 Missing/not-owned delete attempts do not leak another user's data — 02300e5
- [x] 4.8 PR/handoff notes list the validation commands and manual smoke checks performed — 02300e5
