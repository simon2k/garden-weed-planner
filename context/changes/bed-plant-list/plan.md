# Bed Plant List Implementation Plan

## Overview

Implement roadmap S-02: a logged-in user can maintain a plant list for each garden bed as decision-making context while reviewing the weeding priority queue. The feature adds plant add/list behavior only; plants are visible from the existing `/garden` queue but do not affect priority scoring or queue order.

## Current State Analysis

F-01 and S-01 are implemented. `public.garden_beds` exists with per-user ownership and RLS, and `/garden` renders a protected React queue UI backed by `GET/POST /api/garden/beds`. The app has no plant persistence, plant domain helpers, or plant UI yet.

## Desired End State

A user can expand a bed in the `/garden` queue, load the plants for that bed, and add a plant with a required name plus optional structured details: planted year, quantity, current height, and current width. Plant rows are isolated per user through database RLS and server-side auth checks. Existing bed queue behavior, priority score, suggested date, and sorting remain unchanged.

### Key Discoveries:

- `supabase/migrations/20260601120000_create_garden_beds.sql:1` defines `public.garden_beds`; S-02 should add a child table rather than modifying this table.
- `src/pages/api/garden/beds.ts:13` shows the existing API pattern: create Supabase client, require `context.locals.user`, validate JSON, return JSON errors.
- `src/components/garden/GardenQueue.tsx:66` owns the current React island state; plant UI should integrate there or in a child component.
- `src/components/garden/GardenQueue.tsx:369` renders each bed card, which is the natural place for expandable plant details.
- `src/lib/garden-beds.ts:203` computes queue fields transiently; S-02 must not persist or change priority calculation.
- `src/middleware.ts:4` already protects `/garden`; no protected-route update is required unless new pages are added.
- `context/changes/priority-bed-queue/plan.md` explicitly excluded plant list scope from S-01, so S-02 should be additive.

## What We're NOT Doing

- No edit or delete behavior for plant entries.
- No plant notes/reminders/warnings; notes are intentionally deferred for a later reminder/warning feature.
- No duplicate blocking; exact duplicate plant names are allowed for MVP.
- No plant-aware priority scoring, queue sorting, suggested-date changes, or persisted priority fields.
- No bed update/delete behavior.
- No separate plant management page or new protected route.
- No weed observations or weeding-history behavior.

## Implementation Approach

Use a normalized `garden_bed_plants` table with a foreign key to `garden_beds` and a server-controlled `user_id`. Add a small domain helper module for plant validation and response mapping. Expose nested plant endpoints under the bed resource, then add an expandable plant section inside each queue card that lazy-loads plants only when opened.

## Critical Implementation Details

### User isolation

Keep `user_id` server-controlled on plant inserts. The app should verify or rely on RLS for parent-bed ownership before returning plant rows, but clients must never be able to attach plants to another user's bed by passing `user_id`.

### Queue stability

Do not add `plants` to `GardenBedQueueItem` and do not alter `toSortedGardenBedQueue`. Plant loading is contextual UI state, separate from the priority queue response.

### Current-size semantics

`height_cm` and `width_cm` mean the plant's current size at entry time, not mature size. Because S-02 has no edit flow, the UI should avoid implying these values stay automatically up to date.

## Phase 1: Database Contract and RLS

### Overview

Create durable plant persistence with constraints, indexes, timestamps, and RLS scoped to the owning user and parent bed.

### Changes Required:

#### 1. Plant table migration

**File**: `supabase/migrations/<timestamp>_create_garden_bed_plants.sql`

**Intent**: Add a normalized one-to-many table for plants assigned to a garden bed.

**Contract**: Create `public.garden_bed_plants` with `id uuid primary key default gen_random_uuid()`, `bed_id uuid not null references public.garden_beds(id) on delete cascade`, `user_id uuid not null references auth.users(id) on delete cascade`, `name text not null`, `planted_year integer`, `quantity integer`, `height_cm numeric`, `width_cm numeric`, `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()`. Add check constraints requiring `length(btrim(name)) > 0`, `planted_year is null or planted_year between 1900 and the current calendar year`, `quantity is null or quantity > 0`, `height_cm is null or height_cm > 0`, and `width_cm is null or width_cm > 0`.

#### 2. Indexes

**File**: `supabase/migrations/<timestamp>_create_garden_bed_plants.sql`

**Intent**: Support common per-bed list queries without over-optimizing for MVP scale.

**Contract**: Add an index for listing plants by bed and creation order, such as `(bed_id, created_at desc)`, and an ownership-oriented index such as `(user_id, bed_id)`.

#### 3. RLS policies

**File**: `supabase/migrations/<timestamp>_create_garden_bed_plants.sql`

**Intent**: Ensure users can only select and insert plant rows for their own beds.

**Contract**: Enable RLS on `public.garden_bed_plants`. Add authenticated select policy requiring `user_id = auth.uid()`. Add authenticated insert policy requiring `user_id = auth.uid()` and parent bed ownership via an `exists` check against `public.garden_beds` where `garden_beds.id = bed_id` and `garden_beds.user_id = auth.uid()`.

#### 4. Updated-at trigger

**File**: `supabase/migrations/<timestamp>_create_garden_bed_plants.sql`

**Intent**: Keep timestamp behavior consistent with `garden_beds`.

**Contract**: Add a table-specific trigger function or trigger that sets `updated_at = now()` before updates on `public.garden_bed_plants`. It may reuse an existing compatible timestamp function only if the signature and search path are safe.

### Success Criteria:

#### Automated Verification:

- Supabase migration file exists and defines `public.garden_bed_plants` with required columns and constraints.
- Migration includes RLS enabled plus authenticated select and insert policies.
- Migration includes indexes for per-bed listing and ownership filtering.
- `npx astro sync` completes after migration is added.

#### Manual Verification:

- SQL/RLS smoke test confirms an authenticated user cannot select or insert plants for another user's bed.
- Reviewer confirms no update/delete plant policies were added in this phase.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Plant Domain Helpers

### Overview

Create a small domain module for plant types, validation, insert mapping, and response shaping.

### Changes Required:

#### 1. Bed plant domain module

**File**: `src/lib/bed-plants.ts`

**Intent**: Keep plant validation and API response shaping out of route handlers, following the `src/lib/garden-beds.ts` pattern.

**Contract**: Export row, response, create-input, insert-payload, and validation-result types for bed plants. The public response must omit ownership internals that the client does not need.

#### 2. Create validation

**File**: `src/lib/bed-plants.ts`

**Intent**: Validate plant payloads before Supabase inserts.

**Contract**: Add `validateCreateBedPlantInput(value: unknown)` requiring a non-empty trimmed `name` string and accepting optional `planted_year`, `quantity`, `height_cm`, and `width_cm`. `planted_year` must be an integer from 1900 through the current calendar year; future years are rejected because the field means already planted. `quantity` must be a positive integer when present. `height_cm` and `width_cm` must be positive numbers when present and represent current plant size, not mature size.

#### 3. Insert and response mapping

**File**: `src/lib/bed-plants.ts`

**Intent**: Make server-controlled ownership explicit.

**Contract**: Add helpers equivalent to `toBedPlantInsertPayload(input, bedId, userId)` and `toBedPlantResponse(row)`. `bed_id` and `user_id` must come from route context, not request body.

### Success Criteria:

#### Automated Verification:

- `src/lib/bed-plants.ts` exports the plant contracts needed by the API route.
- Validation rejects missing, non-string, and whitespace-only names.
- Validation accepts duplicate names and optional structured plant details.
- `npm run lint` passes for the new module.

#### Manual Verification:

- Reviewer confirms plant validation does not introduce plant priority or duplicate-blocking rules.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Nested Plant API

### Overview

Expose authenticated nested endpoints for listing and adding plants for a specific bed.

### Changes Required:

#### 1. Dynamic nested route

**File**: `src/pages/api/garden/beds/[bedId]/plants.ts`

**Intent**: Add a clear API boundary for plant context without changing `GET/POST /api/garden/beds`.

**Contract**: Export uppercase `GET` and `POST` handlers. Both handlers require configured Supabase and `context.locals.user`, read `context.params.bedId`, and return JSON with the same error style used by `src/pages/api/garden/beds.ts`.

#### 2. Parent-bed ownership check

**File**: `src/pages/api/garden/beds/[bedId]/plants.ts`

**Intent**: Prevent plant access through guessed bed IDs before listing or inserting rows.

**Contract**: Confirm the requested bed belongs to `context.locals.user.id` before returning plants or inserting a plant. Return `404` for missing or non-owned beds rather than leaking ownership information.

#### 3. GET plants

**File**: `src/pages/api/garden/beds/[bedId]/plants.ts`

**Intent**: Return the current plant list for a bed.

**Contract**: Query `garden_bed_plants` for the route `bedId` and current user, ordered by `created_at desc`. Return `200` JSON as `{ plants: BedPlantResponse[] }`.

#### 4. POST plant

**File**: `src/pages/api/garden/beds/[bedId]/plants.ts`

**Intent**: Add a plant to the selected bed.

**Contract**: Read JSON, validate with `validateCreateBedPlantInput`, build an insert payload with route `bedId` and current `user.id`, insert into `garden_bed_plants`, and return `201` JSON as `{ plant: BedPlantResponse }`.

### Success Criteria:

#### Automated Verification:

- `GET /api/garden/beds/[bedId]/plants` route exists and compiles.
- `POST /api/garden/beds/[bedId]/plants` route exists and compiles.
- API route returns `401` for unauthenticated requests and `503` when Supabase is not configured.
- API route returns `400` for invalid JSON or invalid plant payloads.
- `npm run lint` passes.

#### Manual Verification:

- Authenticated user can list an empty plant list for their own bed.
- Authenticated user can add a plant with name and optional planted year, quantity, current height, and current width to their own bed.
- Authenticated user receives not-found behavior for another user's bed ID.
- Existing `GET/POST /api/garden/beds` responses remain backward compatible.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Expandable Plant UI

### Overview

Add expandable plant details to each queue card so the queue stays readable while plant context remains close to the bed decision.

### Changes Required:

#### 1. Plant UI state and types

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Track expanded cards, per-bed plant lists, and per-bed loading/submitting/error state.

**Contract**: Add a client-side `BedPlant` response type matching the API. Track expansion by `bed.id`; when a bed expands for the first time, fetch its plant list from `/api/garden/beds/${bed.id}/plants`.

#### 2. Expand/collapse affordance

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Let users view plant context without making every queue card large by default.

**Contract**: Add a button or accessible control in `QueueCard` to expand/collapse the plant section. The collapsed state should preserve current queue metrics and priority display.

#### 3. Plant list display

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Show existing plants as contextual information for the bed.

**Contract**: Render loading, empty, error, and loaded states for each expanded bed. Each plant item displays `name`; display planted year, quantity, current height, and current width only when present.

#### 4. Add plant form

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Allow adding a plant directly from the expanded bed card.

**Contract**: Add a small form with required name and optional planted year, quantity, current height, and current width fields. Client validation rejects blank names, future planted years, non-positive quantities, and non-positive dimensions before POST. Submit JSON to `POST /api/garden/beds/${bed.id}/plants`, append or reload the plant list on success, clear the form, and do not refresh/re-sort the bed queue.

### Success Criteria:

#### Automated Verification:

- Plant UI compiles without TypeScript or JSX lint errors.
- Blank plant names and invalid optional details are rejected client-side before POST.
- `npm run lint` passes.
- `npm run build` passes.

#### Manual Verification:

- User can expand a bed card, see empty plant state, add a plant with optional structured details, and see it listed.
- User can collapse and re-expand a bed without losing already loaded plant context unexpectedly.
- Adding a plant does not change the bed's priority label, priority score, suggested date, or queue position.
- Error states are visible when plant list loading or plant creation fails.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Final Verification and Scope Guard

### Overview

Run the repository gates and manually verify the S-02 slice without expanding into adjacent roadmap items.

### Changes Required:

#### 1. Repository verification

**File**: `context/changes/bed-plant-list/change.md`

**Intent**: Record handoff evidence and keep the change status aligned with implementation progress.

**Contract**: After implementation, record validation commands and manual smoke-test notes in `change.md` or review artifacts. Do not modify `context/archive/`.

#### 2. Scope review

**File**: `context/changes/bed-plant-list/plan.md`

**Intent**: Ensure the implementation remains S-02 only.

**Contract**: Confirm no edit/delete plants, no weed observations, no weeding history, no plant-aware priority scoring, no queue API breaking changes, and no bed update/delete scope slipped in.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` passes.
- `npm run lint` passes.
- `npm run build` passes.

#### Manual Verification:

- Authenticated add/list plant flow works from `/garden` for at least one bed.
- Cross-user plant access is blocked by API/RLS smoke testing.
- Existing add-bed and queue sorting flow still works.
- Reviewer confirms no S-03/S-04 scope or plant priority scoring was introduced.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before marking the change ready for implementation review.

---

## Testing Strategy

### Unit Tests:

- No automated test runner is configured; do not invent `npm test`.
- Use `npm run lint` and `npm run build` as the automated code gates.
- If future tests are added, prioritize `validateCreateBedPlantInput` for blank names, planted-year direction, quantity/dimension positivity, and duplicate acceptance.

### Integration Tests:

- Use API smoke tests against local or target Supabase: authenticated own-bed list, own-bed insert, non-owned-bed access, invalid payload.
- Verify existing `/api/garden/beds` still returns queue items without plant fields or priority changes.

### Manual Testing Steps:

1. Sign in and open `/garden`.
2. Add or use an existing bed.
3. Expand the bed's plant section.
4. Confirm empty state appears.
5. Add a plant with only a name.
6. Add a plant with name, planted year, quantity, current height, and current width.
7. Confirm both plants are listed and duplicate names are allowed.
8. Collapse and re-expand the card.
9. Confirm queue order and priority fields did not change because plants are display-only context.
10. Confirm another user's bed ID cannot be used to list or create plants.

## Performance Considerations

MVP scale is small and low-QPS. Lazy-loading plants per expanded bed avoids bloating the main queue response and keeps initial `/garden` load focused on priority data. The per-bed plant index is enough for expected plant-list sizes.

## Migration Notes

This change adds a new child table and does not migrate existing data. During development, rollback can drop `public.garden_bed_plants` and related policies/triggers. After real user plant data exists, prefer forward fixes over dropping the table.

## References

- Roadmap S-02: `context/foundation/roadmap.md`
- PRD FR-003: `context/foundation/prd.md`
- Existing bed migration: `supabase/migrations/20260601120000_create_garden_beds.sql:1`
- Existing garden API: `src/pages/api/garden/beds.ts:13`
- Existing garden UI island: `src/components/garden/GardenQueue.tsx:66`
- Existing queue card: `src/components/garden/GardenQueue.tsx:369`
- Existing priority helpers: `src/lib/garden-beds.ts:203`
- Protected route config: `src/middleware.ts:4`
- S-01 plan exclusion of plant list: `context/changes/priority-bed-queue/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Contract and RLS

#### Automated

- [x] 1.1 Supabase migration file exists and defines `public.garden_bed_plants` with required columns and constraints. — fb1dac9
- [x] 1.2 Migration includes RLS enabled plus authenticated select and insert policies. — fb1dac9
- [x] 1.3 Migration includes indexes for per-bed listing and ownership filtering. — fb1dac9
- [x] 1.4 `npx astro sync` completes after migration is added. — fb1dac9

#### Manual

- [x] 1.5 SQL/RLS smoke test confirms an authenticated user cannot select or insert plants for another user's bed. — fb1dac9
- [x] 1.6 Reviewer confirms no update/delete plant policies were added in this phase. — fb1dac9

### Phase 2: Plant Domain Helpers

#### Automated

- [x] 2.1 `src/lib/bed-plants.ts` exports the plant contracts needed by the API route. — 6a5b9e4
- [x] 2.2 Validation rejects missing, non-string, and whitespace-only names. — 6a5b9e4
- [x] 2.3 Validation accepts duplicate names and optional structured plant details. — 6a5b9e4
- [x] 2.4 `npm run lint` passes for the new module. — 6a5b9e4

#### Manual

- [x] 2.5 Reviewer confirms plant validation does not introduce plant priority or duplicate-blocking rules. — 6a5b9e4

### Phase 3: Nested Plant API

#### Automated

- [x] 3.1 `GET /api/garden/beds/[bedId]/plants` route exists and compiles. — 680de63
- [x] 3.2 `POST /api/garden/beds/[bedId]/plants` route exists and compiles. — 680de63
- [x] 3.3 API route returns `401` for unauthenticated requests and `503` when Supabase is not configured. — 680de63
- [x] 3.4 API route returns `400` for invalid JSON or invalid plant payloads. — 680de63
- [x] 3.5 `npm run lint` passes. — 680de63

#### Manual

- [x] 3.6 Authenticated user can list an empty plant list for their own bed. — 680de63
- [x] 3.7 Authenticated user can add a plant with name and optional planted year, quantity, current height, and current width to their own bed. — 680de63
- [x] 3.8 Authenticated user receives not-found behavior for another user's bed ID. — 680de63
- [x] 3.9 Existing `GET/POST /api/garden/beds` responses remain backward compatible. — 680de63

### Phase 4: Expandable Plant UI

#### Automated

- [x] 4.1 Plant UI compiles without TypeScript or JSX lint errors. — 56a181f
- [x] 4.2 Blank plant names and invalid optional details are rejected client-side before POST. — 56a181f
- [x] 4.3 `npm run lint` passes. — 56a181f
- [x] 4.4 `npm run build` passes. — 56a181f

#### Manual

- [x] 4.5 User can expand a bed card, see empty plant state, add a plant with optional structured details, and see it listed. — 56a181f
- [x] 4.6 User can collapse and re-expand a bed without losing already loaded plant context unexpectedly. — 56a181f
- [x] 4.7 Adding a plant does not change the bed's priority label, priority score, suggested date, or queue position. — 56a181f
- [x] 4.8 Error states are visible when plant list loading or plant creation fails. — 56a181f

### Phase 5: Final Verification and Scope Guard

#### Automated

- [x] 5.1 `npx astro sync` passes. — 790ca2d
- [x] 5.2 `npm run lint` passes. — 790ca2d
- [x] 5.3 `npm run build` passes. — 790ca2d

#### Manual

- [x] 5.4 Authenticated add/list plant flow works from `/garden` for at least one bed. — 790ca2d
- [x] 5.5 Cross-user plant access is blocked by API/RLS smoke testing. — 790ca2d
- [x] 5.6 Existing add-bed and queue sorting flow still works. — 790ca2d
- [x] 5.7 Reviewer confirms no S-03/S-04 scope or plant priority scoring was introduced. — 790ca2d
