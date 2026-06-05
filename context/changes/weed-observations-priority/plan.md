# Weed Observations Priority Implementation Plan

## Overview

Implement roadmap S-03: users can add manual weed observations for each garden bed and immediately see those observations affect priority, queue order, and the suggested next-weeding date. The feature adds a Polish weed catalog, Polish risk-trait inputs, 60-day decaying observation pressure, and a short user-facing explanation of why the priority changed.

## Current State Analysis

The app already has a protected `/garden` queue where logged-in users can add beds and see computed priority. Priority is currently calculated from `garden_beds` fields only: weed level, last weeded date, area, estimated minutes, and mulch depth. Plant lists already provide a close nested child-resource pattern but intentionally do not affect priority.

## Desired End State

A logged-in user can expand a garden bed, add a weed observation using a broad Polish weed catalog plus simple Polish risk-trait checkboxes, and see the full queue refresh with updated priority score, suggested next-weeding date, and a concise explanation such as “Przyspieszono: rozłogi, wysokie pokrycie, kwitnienie.” Observations are user-scoped by database RLS and app-level ownership checks, and only recent observations within a 60-day decay window affect the current queue.

### Key Discoveries:

- `src/lib/garden-beds.ts:43-57` owns the queue item and priority result contracts that must be extended with observation pressure fields.
- `src/lib/garden-beds.ts:178-220` computes suggested date and priority score; observation scoring belongs in this server-side/domain path, not in React.
- `src/pages/api/garden/beds.ts:13-35` is the main queue API and must load observation summaries before decorating/sorting beds.
- `src/pages/api/garden/beds/[bedId]/plants.ts:15-92` provides the nested authenticated add/list route pattern to mirror for observations.
- `supabase/migrations/20260605130000_create_garden_bed_plants.sql:1-49` provides the child-table, index, RLS, and parent-ownership insert-policy pattern.
- `context/foundation/lessons.md` requires explicit date-direction semantics; `observed_at` must reject future dates and allow past dates including today.
- User decisions from planning: broad Polish catalog 20+ items, Polish checkbox traits, simple `coverage` enum, 60-day decay, short explanation, and full queue reload after adding an observation.

## What We're NOT Doing

- No photo upload or image-based weed recognition.
- No edit/delete weed observations in this slice.
- No S-04 “mark bed as weeded” reset/history behavior.
- No persisted priority fields or aggregate columns on `garden_beds`.
- No full calendar/task planner.
- No automated test runner introduction; use existing lint/build gates and manual smoke checks.
- No herbicide recommendations or treatment advice beyond priority reasoning.

## Implementation Approach

Follow the existing child-resource pattern from plants: migration first, domain helpers second, API routes third, then UI wiring. Keep observations append-only for this slice and compute priority at request time by loading observations for listed bed IDs, summarizing them into observation pressure, and passing that summary into queue decoration. Use a broad local Polish catalog as data in `src/lib/`, with catalog defaults pre-filling risk traits while still allowing checkbox overrides in submitted observations.

## Critical Implementation Details

Adding an observation must refresh the entire bed queue, not just the card, because the observation can change priority label, suggested date, and sort position. Observation dates are occurrence dates; both server and UI validation must reject future dates while accepting today and past dates.

## Phase 1: Database Contract and RLS

### Overview

Create the persistent, user-scoped table for weed observations and enforce isolation with RLS.

### Changes Required:

#### 1. Weed observation migration

**File**: `supabase/migrations/<timestamp>_create_garden_bed_weed_observations.sql`

**Intent**: Add the durable child table that stores manual weed observations per bed.

**Contract**: Create `public.garden_bed_weed_observations` with `id`, `bed_id`, `user_id`, `observed_at`, `weed_catalog_slug`, `weed_name`, `weed_category`, `growth_stage`, `coverage`, `severity`, six risk-trait booleans, `note`, `created_at`, and `updated_at`. `bed_id` references `public.garden_beds(id)` on delete cascade; `user_id` references `auth.users(id)` on delete cascade.

#### 2. Constraints and indexes

**File**: `supabase/migrations/<timestamp>_create_garden_bed_weed_observations.sql`

**Intent**: Keep database values aligned with the application contract and support efficient per-user/per-bed reads.

**Contract**: Add checks for non-future `observed_at`, allowed `weed_category`, allowed `growth_stage`, allowed `coverage` (`low`, `medium`, `high`), `severity between 1 and 5`, optional non-empty trimmed `weed_name`, optional non-empty trimmed `weed_catalog_slug`, and optional non-empty trimmed `note`. Add indexes for `(bed_id, observed_at desc)` and `(user_id, bed_id)`.

#### 3. RLS policies and timestamp trigger

**File**: `supabase/migrations/<timestamp>_create_garden_bed_weed_observations.sql`

**Intent**: Mirror the plant table’s security posture with select/insert only for this slice.

**Contract**: Enable RLS. Add authenticated select policy scoped to `user_id = auth.uid()`. Add authenticated insert policy requiring `user_id = auth.uid()` and parent bed ownership via `exists` against `garden_beds`. Add a table-scoped `updated_at` trigger. Do not add update/delete policies.

### Success Criteria:

#### Automated Verification:

- Migration file exists and defines `public.garden_bed_weed_observations` with required columns and constraints.
- Migration includes authenticated select and insert RLS policies with parent bed ownership check.
- Migration includes per-bed and user/bed indexes plus an `updated_at` trigger.
- `npx astro sync` passes after the migration is added.

#### Manual Verification:

- Reviewer confirms no update/delete observation policies were added.
- SQL/RLS smoke test confirms user A cannot list or insert observations for user B’s bed.
- SQL/RLS smoke test confirms future `observed_at` is rejected.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Observation Domain Model and Polish Catalog

### Overview

Add TypeScript contracts, validation, response mapping, and the broad Polish weed catalog.

### Changes Required:

#### 1. Observation domain module

**File**: `src/lib/weed-observations.ts`

**Intent**: Keep observation product logic in `src/lib/` before API/UI wiring.

**Contract**: Export types/constants for `WeedCategory`, `GrowthStage`, `ObservationCoverage`, `WeedRiskTrait`, `CreateWeedObservationInput`, `WeedObservationRow`, `WeedObservationResponse`, and `WeedObservationInsertPayload`. Use categories `annual_seed`, `creeping_perennial`, `tuber_or_bulb`, `deep_root_perennial`, and `unknown`; stages `seedling`, `vegetative`, `flowering`, `seeding`; coverage `low`, `medium`, `high`.

#### 2. Broad Polish weed catalog

**File**: `src/lib/weed-observations.ts`

**Intent**: Provide Polish UX defaults and scoring hints without requiring the user to know botanical traits.

**Contract**: Export a readonly catalog of at least 20 Polish weed entries. Each entry has `slug`, Polish `name`, `category`, default risk traits, and short Polish helper text. Include common/problematic examples such as perz właściwy, powój polny, podagrycznik pospolity, mniszek lekarski, pokrzywa zwyczajna, komosa biała, gwiazdnica pospolita, skrzyp polny, ostrożeń polny, rdest, babka, tasznik, żółtlica, chwastnica, jasnota, przytulia, krwawnik, koniczyna, podbiał, turzyca/nutsedge-like fallback, and “inny/nie wiem”.

#### 3. Validation and mapping

**File**: `src/lib/weed-observations.ts`

**Intent**: Validate all client input before Supabase writes and make server-controlled ownership explicit.

**Contract**: Add `validateCreateWeedObservationInput(value: unknown)` requiring `observed_at`, `weed_category`, `growth_stage`, `coverage`, and `severity`. It accepts optional `weed_catalog_slug`, optional free-text `weed_name`, optional `note`, and boolean risk traits. `observed_at` must be a strict `YYYY-MM-DD` calendar date that is not in the future. Add `toWeedObservationInsertPayload(input, bedId, userId)` and `toWeedObservationResponse(row)`.

### Success Criteria:

#### Automated Verification:

- `src/lib/weed-observations.ts` exports catalog, constants, domain types, validation, and mapping helpers.
- Validation rejects future observation dates, invalid enum values, invalid severity, non-object payloads, and empty optional strings when present.
- Validation accepts today’s date, past dates, catalog-based observations, and custom/free-text observations.
- `npm run lint` passes for the new module.

#### Manual Verification:

- Reviewer confirms catalog labels and risk traits are Polish and understandable for a gardener.
- Reviewer confirms `coverage` is the simple enum `low | medium | high`, not percentage coverage.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Observation-Aware Priority Algorithm

### Overview

Extend queue decoration so recent observations affect priority score, suggested date, and human-readable reasons.

### Changes Required:

#### 1. Observation summary contract

**File**: `src/lib/garden-beds.ts`

**Intent**: Let queue decoration consume observation summaries without coupling it to Supabase row shape.

**Contract**: Add exported observation summary types, including observation pressure score, latest observation date, observation count, and Polish reason labels. Extend `GardenBedPriorityResult` and `GardenBedQueueItem` with `observation_pressure_score`, `observation_pressure_label`, `observation_count`, and `observation_reasons`.

#### 2. Pressure scoring

**File**: `src/lib/garden-beds.ts`

**Intent**: Convert observations into a bounded priority boost.

**Contract**: Add scoring based on severity, coverage enum, growth stage, risk traits, repeat pressure, and 60-day linear decay. Cap observation pressure at `80`. Use current date from existing date helpers so the algorithm remains deterministic for one request.

#### 3. Suggested date adjustment

**File**: `src/lib/garden-beds.ts`

**Intent**: Make dangerous recent observations shorten the next-weeding date, not just raise score.

**Contract**: Adjust the fixed base interval by pressure bands: no change for `0-14`, 20% sooner for `15-29`, 35% sooner for `30-49`, 50% sooner for `50-69`, and 65% sooner for `70+`. Also compute a response window from newest observation (`14`, `7`, `3`, or `1` days) and choose the earlier of `last_weeded_at + adjusted interval` and `newest_observed_at + response window` when both are available.

#### 4. Queue decoration API

**File**: `src/lib/garden-beds.ts`

**Intent**: Preserve existing queue behavior while allowing observation-aware sorting.

**Contract**: Update `getGardenBedPriority`, `toGardenBedQueueItem`, and `toSortedGardenBedQueue` to accept an optional observation summary/map. Existing callers without observations should continue producing the current baseline result with zero observation pressure and no reasons.

### Success Criteria:

#### Automated Verification:

- Existing bed queue decoration still works when no observations are supplied.
- Observation pressure increases `priority_score` and can change `priority` from OK to soon/urgent.
- Observation pressure can make `suggested_weed_at` earlier than the base fixed interval.
- Observations older than 60 days no longer affect pressure.
- `npm run lint` passes.

#### Manual Verification:

- Reviewer confirms reason labels explain the main factors in Polish.
- Reviewer confirms an observation today can make a recently weeded bed urgent when traits are severe enough.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: API Integration

### Overview

Expose authenticated nested observation endpoints and make the bed queue API observation-aware.

### Changes Required:

#### 1. Nested observation route

**File**: `src/pages/api/garden/beds/[bedId]/weed-observations.ts`

**Intent**: Add a bed-scoped add/list surface for weed observations.

**Contract**: Export uppercase `GET` and `POST` handlers. Both require configured Supabase and `context.locals.user`, validate `context.params.bedId` as UUID, verify parent bed ownership, and use safe JSON errors matching the plants route.

#### 2. GET observations

**File**: `src/pages/api/garden/beds/[bedId]/weed-observations.ts`

**Intent**: Return the current observation history for one bed.

**Contract**: Query `garden_bed_weed_observations` filtered by route `bedId` and current `user.id`, ordered by `observed_at desc, created_at desc`. Return `200` JSON as `{ observations: WeedObservationResponse[] }`.

#### 3. POST observation

**File**: `src/pages/api/garden/beds/[bedId]/weed-observations.ts`

**Intent**: Add a manual observation for the selected bed.

**Contract**: Read JSON, validate with `validateCreateWeedObservationInput`, insert with route `bedId` and current `user.id`, and return `201` JSON as `{ observation: WeedObservationResponse }`.

#### 4. Queue API observation summary

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Ensure the main queue reflects observations immediately after reload.

**Contract**: After listing the user’s beds, query observations for the returned bed IDs and current user. Build an observation summary map and pass it to `toSortedGardenBedQueue`. If there are no beds, skip the observation query. Preserve authenticated/503/500 error style and the existing `{ beds }` response shape with added queue item fields.

### Success Criteria:

#### Automated Verification:

- `GET /api/garden/beds/[bedId]/weed-observations` route exists and compiles.
- `POST /api/garden/beds/[bedId]/weed-observations` route exists and compiles.
- Nested route returns 401 for unauthenticated requests, 503 when Supabase is not configured, 404 for invalid/non-owned bed IDs, and 400 for invalid payloads.
- `GET /api/garden/beds` returns observation-aware queue fields without breaking existing bed fields.
- `npm run lint` passes.

#### Manual Verification:

- Authenticated user can list empty observations for their own bed.
- Authenticated user can add an observation to their own bed.
- Authenticated user receives not-found behavior for another user’s bed ID.
- Main queue order/date/score changes after an observation affects pressure.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Garden UI Integration

### Overview

Add observation input/listing to the existing garden queue UI and show priority-impact explanations.

### Changes Required:

#### 1. Queue item type and display

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Render observation-aware fields returned by the queue API.

**Contract**: Extend the client `GardenBedQueueItem` type with observation pressure fields. In each card, display a short Polish explanation when `observation_reasons` are present and show observation pressure in a compact, non-technical way.

#### 2. Observation state and lazy loading

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Track per-bed observation lists and forms without disrupting existing plant expansion behavior.

**Contract**: Add per-bed observation state equivalent to plant state: observations, loading, submitting, error, form, field errors, and loaded flag. Add an accessible “Pokaż obserwacje chwastów” expansion control separate from or clearly grouped with the plant section.

#### 3. Observation form

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Let users add Polish catalog-based observations from the bed card.

**Contract**: Render fields for weed catalog selection, optional custom name, observed date, growth stage, coverage enum, severity 1-5, Polish risk-trait checkboxes, and optional note. Selecting a catalog item should prefill category/default traits while still allowing checkbox adjustments. Client validation must reject future `observed_at`, invalid severity, missing required enums, and blank required values before POST.

#### 4. Observation submit behavior

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Make the priority impact visible immediately.

**Contract**: Submit JSON to `POST /api/garden/beds/${bed.id}/weed-observations`, add or reload the observation list on success, clear the form, show a success message, and call `loadBeds()` so queue order/date/priority reflects the new observation.

### Success Criteria:

#### Automated Verification:

- Observation UI compiles without TypeScript/JSX lint errors.
- Client validation rejects future observed dates and invalid required fields before POST.
- Adding observation code does not break existing add-bed or plant-list UI state.
- `npm run lint` passes.
- `npm run build` passes.

#### Manual Verification:

- User can expand a bed’s weed observation section and see an empty state.
- User can add an observation using a Polish catalog item and Polish risk checkboxes.
- User can add a custom/unknown weed observation.
- After adding a high-risk observation, the queue refreshes and shows updated priority/date plus short explanation.
- Existing plant section still works.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 6: Final Verification and Scope Guard

### Overview

Run project gates and manually verify the S-03 slice end to end without drifting into S-04.

### Changes Required:

#### 1. Repository verification

**File**: `context/changes/weed-observations-priority/change.md`

**Intent**: Record validation evidence and keep the change ready for implementation review.

**Contract**: Run `npx astro sync`, `npm run lint`, and `npm run build`. Record command results and manual smoke-test notes in change artifacts.

#### 2. Scope review

**File**: `context/changes/weed-observations-priority/plan.md`

**Intent**: Ensure S-03 stays focused on observations affecting priority.

**Contract**: Confirm no observation edit/delete, no mark-as-weeded behavior, no photo recognition, no persisted priority columns, and no unrelated bed/plant behavior changes slipped in.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` passes.
- `npm run lint` passes.
- `npm run build` passes.

#### Manual Verification:

- Authenticated end-to-end observation add/list flow works from `/garden`.
- High-risk observation changes priority score, suggested date, reason label, and possibly queue position.
- Cross-user observation access is blocked by API/RLS smoke testing.
- Existing add-bed and plant-list flows still work.
- Reviewer confirms no S-04 scope was implemented.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before marking the change ready for implementation review.

---

## Testing Strategy

### Unit Tests:

- No automated test runner is configured; do not invent `npm test`.
- Prioritize future tests around `validateCreateWeedObservationInput`, date direction, enum validation, severity bounds, catalog defaults, observation pressure bands, 60-day decay, and suggested-date adjustment.

### Integration Tests:

- API smoke tests for authenticated own-bed observation list/insert.
- API smoke tests for non-owned bed access returning not-found behavior.
- Queue API smoke test confirming observation fields appear and score/date change after insert.
- RLS smoke tests confirming users cannot select or insert observations for another user’s bed.

### Manual Testing Steps:

1. Sign in and open `/garden`.
2. Create or select an existing bed with complete baseline priority inputs.
3. Expand weed observations and confirm empty state.
4. Add a low-risk observation and confirm it appears in the list.
5. Add a high-risk catalog observation with severe traits and high coverage.
6. Confirm the full queue refreshes, priority/date/reasons update, and the card may move.
7. Add a custom/unknown observation and confirm it works.
8. Try a future observation date and confirm client/server rejection.
9. Confirm another user cannot list or create observations for this bed.
10. Confirm plants can still be expanded/listed/added.

## Performance Considerations

MVP data volume is small, so loading observations for the current user’s listed bed IDs in `GET /api/garden/beds` is acceptable. Keep the query scoped to current user and current bed IDs; if observation volume grows later, introduce a database view or RPC summary rather than persisting priority fields prematurely.

## Migration Notes

This change adds a new child table and does not migrate existing data. Rollback during development can drop `public.garden_bed_weed_observations` and its policies/triggers. After real user observations exist, prefer forward migrations over destructive rollback.

## References

- Research: `context/changes/weed-observations-priority/research.md`
- PRD FR-005/FR-006/FR-007: `context/foundation/prd.md`
- Roadmap S-03: `context/foundation/roadmap.md`
- Existing priority helpers: `src/lib/garden-beds.ts:43-220`
- Existing queue API: `src/pages/api/garden/beds.ts:13-35`
- Existing nested plants API: `src/pages/api/garden/beds/[bedId]/plants.ts:15-92`
- Existing child-table RLS pattern: `supabase/migrations/20260605130000_create_garden_bed_plants.sql:1-49`
- Date semantics lesson: `context/foundation/lessons.md`
- Iowa State annual weed timing: https://yardandgarden.extension.iastate.edu/how-to/how-manage-annual-weeds
- University of Maine perennial weed structures: https://extension.umaine.edu/piscataquis/home-gardening/basicgarden/understandingweeds/
- University of Nevada bindweed spread: https://extension.unr.edu/publication.aspx?PubID=4834
- WVU yellow nutsedge tubers/rhizomes: https://extension.wvu.edu/lawn-gardening-pests/weeds/yellow-nutsedge

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Contract and RLS

#### Automated

- [x] 1.1 Migration file exists and defines `public.garden_bed_weed_observations` with required columns and constraints. — 4e26242
- [x] 1.2 Migration includes authenticated select and insert RLS policies with parent bed ownership check. — 4e26242
- [x] 1.3 Migration includes per-bed and user/bed indexes plus an `updated_at` trigger. — 4e26242
- [x] 1.4 `npx astro sync` passes after the migration is added. — 4e26242

#### Manual

- [x] 1.5 Reviewer confirms no update/delete observation policies were added. — 4e26242
- [x] 1.6 SQL/RLS smoke test confirms user A cannot list or insert observations for user B’s bed. — 4e26242
- [x] 1.7 SQL/RLS smoke test confirms future `observed_at` is rejected. — 4e26242

### Phase 2: Observation Domain Model and Polish Catalog

#### Automated

- [x] 2.1 `src/lib/weed-observations.ts` exports catalog, constants, domain types, validation, and mapping helpers. — 66747c0
- [x] 2.2 Validation rejects future observation dates, invalid enum values, invalid severity, non-object payloads, and empty optional strings when present. — 66747c0
- [x] 2.3 Validation accepts today’s date, past dates, catalog-based observations, and custom/free-text observations. — 66747c0
- [x] 2.4 `npm run lint` passes for the new module. — 66747c0

#### Manual

- [x] 2.5 Reviewer confirms catalog labels and risk traits are Polish and understandable for a gardener. — 66747c0
- [x] 2.6 Reviewer confirms `coverage` is the simple enum `low | medium | high`, not percentage coverage. — 66747c0

### Phase 3: Observation-Aware Priority Algorithm

#### Automated

- [x] 3.1 Existing bed queue decoration still works when no observations are supplied. — 0445e05
- [x] 3.2 Observation pressure increases `priority_score` and can change `priority` from OK to soon/urgent. — 0445e05
- [x] 3.3 Observation pressure can make `suggested_weed_at` earlier than the base fixed interval. — 0445e05
- [x] 3.4 Observations older than 60 days no longer affect pressure. — 0445e05
- [x] 3.5 `npm run lint` passes. — 0445e05

#### Manual

- [x] 3.6 Reviewer confirms reason labels explain the main factors in Polish. — 0445e05
- [x] 3.7 Reviewer confirms an observation today can make a recently weeded bed urgent when traits are severe enough. — 0445e05

### Phase 4: API Integration

#### Automated

- [x] 4.1 `GET /api/garden/beds/[bedId]/weed-observations` route exists and compiles. — 8f0a57b
- [x] 4.2 `POST /api/garden/beds/[bedId]/weed-observations` route exists and compiles. — 8f0a57b
- [x] 4.3 Nested route returns 401 for unauthenticated requests, 503 when Supabase is not configured, 404 for invalid/non-owned bed IDs, and 400 for invalid payloads. — 8f0a57b
- [x] 4.4 `GET /api/garden/beds` returns observation-aware queue fields without breaking existing bed fields. — 8f0a57b
- [x] 4.5 `npm run lint` passes. — 8f0a57b

#### Manual

- [x] 4.6 Authenticated user can list empty observations for their own bed. — 8f0a57b
- [x] 4.7 Authenticated user can add an observation to their own bed. — 8f0a57b
- [x] 4.8 Authenticated user receives not-found behavior for another user’s bed ID. — 8f0a57b
- [x] 4.9 Main queue order/date/score changes after an observation affects pressure. — 8f0a57b

### Phase 5: Garden UI Integration

#### Automated

- [x] 5.1 Observation UI compiles without TypeScript/JSX lint errors. — fed1334
- [x] 5.2 Client validation rejects future observed dates and invalid required fields before POST. — fed1334
- [x] 5.3 Adding observation code does not break existing add-bed or plant-list UI state. — fed1334
- [x] 5.4 `npm run lint` passes. — fed1334
- [x] 5.5 `npm run build` passes. — fed1334

#### Manual

- [x] 5.6 User can expand a bed’s weed observation section and see an empty state. — fed1334
- [x] 5.7 User can add an observation using a Polish catalog item and Polish risk checkboxes. — fed1334
- [x] 5.8 User can add a custom/unknown weed observation. — fed1334
- [x] 5.9 After adding a high-risk observation, the queue refreshes and shows updated priority/date plus short explanation. — fed1334
- [x] 5.10 Existing plant section still works. — fed1334

### Phase 6: Final Verification and Scope Guard

#### Automated

- [x] 6.1 `npx astro sync` passes.
- [x] 6.2 `npm run lint` passes.
- [x] 6.3 `npm run build` passes.

#### Manual

- [x] 6.4 Authenticated end-to-end observation add/list flow works from `/garden`.
- [x] 6.5 High-risk observation changes priority score, suggested date, reason label, and possibly queue position.
- [x] 6.6 Cross-user observation access is blocked by API/RLS smoke testing.
- [x] 6.7 Existing add-bed and plant-list flows still work.
- [x] 6.8 Reviewer confirms no S-04 scope was implemented.
