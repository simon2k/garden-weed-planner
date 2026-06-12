# User Scoped Garden Records Implementation Plan

## Overview

Implement the F-01 foundation from `context/foundation/roadmap.md`: a minimal user-scoped garden bed data contract that later slices can build on safely. This change creates one Supabase table with row-level security, handwritten TypeScript domain contracts, and minimal authenticated API endpoints for smoke verification.

## Current State Analysis

The app already has Supabase auth and server-side session wiring, but it has no product data model yet. `src/lib/supabase.ts` creates a Supabase SSR client from server-only env vars, `src/middleware.ts` stores the authenticated user in `Astro.locals.user`, and auth API handlers already follow the Astro `APIRoute` pattern. The `supabase/` folder exists with config, but no garden-record migrations are present.

## Desired End State

A logged-in user can create and list only their own `garden_beds` records through minimal API endpoints. Supabase RLS enforces isolation at the database layer, the application validates incoming bed data before writes, and future roadmap slices can reuse the table and domain contract without redesigning ownership or raw priority inputs.

### Key Discoveries:

- `src/lib/supabase.ts` already centralizes Supabase SSR client creation and returns `null` when secrets are missing.
- `src/middleware.ts` already populates `Astro.locals.user` for authenticated requests and protects `/dashboard` only.
- `src/pages/api/auth/*.ts` establish the current API route style: uppercase method exports, form/request parsing, Supabase call, then redirect or response.
- `context/foundation/roadmap.md` defines F-01 as a foundation slice that unlocks `S-01` through `S-04`, not as a full garden UI slice.
- `context/foundation/prd.md` requires per-user data isolation and raw inputs for later priority calculation: last weeded date, weed level, area, estimated work time, mulch, and later observations.

## What We're NOT Doing

- No garden bed UI page or `/garden` route in this change.
- No priority algorithm, persisted computed priority, or suggested next-weeding date.
- No weed observations, plant lists, or weeding event/history tables.
- No team/shared garden access model; MVP remains one authenticated user managing their own records.
- No generated Supabase type workflow yet; this change uses handwritten domain contracts.
- No automated test runner is introduced; verification relies on migration checks, lint/build, and manual SQL/API smoke tests.

## Implementation Approach

Build the foundation in layers: database contract first, application contract second, API smoke surface third, and verification/handoff last. The database owns isolation through RLS. The application owns input validation and JSON response shape. The API endpoints stay intentionally small so they verify integration without becoming the full S-01 queue feature.

## Critical Implementation Details

Do not add `/garden` to `PROTECTED_ROUTES` unless this change creates a `/garden` page; for API-only scope, each endpoint must explicitly require `Astro.locals.user` and return an unauthorized response when absent. Keep computed priority out of both schema and API responses until S-01 defines the algorithm.

## Phase 1: Database Contract and RLS

### Overview

Create the Supabase database contract for user-owned garden beds and enforce isolation with row-level security policies.

### Changes Required:

#### 1. Supabase migration directory

**File**: `supabase/migrations/<timestamp>_create_garden_beds.sql`

**Intent**: Create `supabase/migrations/` if it is absent, then add the first product-data migration for garden beds. This establishes the durable table contract future slices depend on.

**Contract**: Create `public.garden_beds` with `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `name text not null`, `area_m2 numeric`, `last_weeded_at date`, `weed_level text not null`, `estimated_minutes integer`, `mulch_depth_cm numeric`, `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()`. Add constraints for non-empty name, `weed_level in ('low', 'medium', 'high')`, `area_m2 is null or area_m2 > 0`, `estimated_minutes is null or estimated_minutes > 0`, and `mulch_depth_cm is null or mulch_depth_cm >= 0`.

#### 2. RLS enablement and policies

**File**: `supabase/migrations/<timestamp>_create_garden_beds.sql`

**Intent**: Make user isolation a database invariant rather than relying only on application filters.

**Contract**: Enable RLS on `public.garden_beds`. Add policies explicitly scoped `to authenticated` for only the API surface this phase exposes: authenticated users may select rows where `user_id = auth.uid()` and insert rows only when `user_id = auth.uid()`. The insert policy must require `with check (user_id = auth.uid())`. Do not add update or delete policies until a later slice introduces update/delete behavior.

**Verification guardrail**: RLS smoke tests must not be judged from an owner or service-role context. Run them with authenticated Supabase clients for user A and user B, or with SQL role/JWT-claim setup that simulates `authenticated` users with distinct `request.jwt.claim.sub` values plus an `anon` role check for unauthenticated access.

#### 3. Timestamp maintenance

**File**: `supabase/migrations/<timestamp>_create_garden_beds.sql`

**Intent**: Keep `updated_at` reliable for future list sorting, audit, and sync decisions.

**Contract**: Add a trigger function or local trigger mechanism that sets `updated_at = now()` before updates on `public.garden_beds`. Keep the implementation scoped to this table unless the repo already has a shared timestamp trigger pattern.

#### 4. Query support

**File**: `supabase/migrations/<timestamp>_create_garden_beds.sql`

**Intent**: Support efficient per-user listing for the first queue slice.

**Contract**: Add an index that supports filtering by `user_id` and a stable list order such as `created_at desc` or `name asc`. Do not add priority-specific indexes before S-01 defines the priority query.

### Success Criteria:

#### Automated Verification:

- Supabase migration file exists under `supabase/migrations/` and contains the `garden_beds` table definition.
- Migration defines ownership constraints, positive-value checks, weed-level check, RLS enablement, and authenticated select/insert policies.
- Migration can be applied locally or reviewed with Supabase CLI without SQL syntax errors.

#### Manual Verification:

- SQL/RLS smoke test confirms user A can insert and select their own bed.
- SQL/RLS smoke test confirms user B cannot select user A's bed.
- SQL/RLS smoke test confirms unauthenticated access cannot read from or insert into `garden_beds`.
- Exact SQL/RLS smoke commands or checklist results are recorded in the change notes before handoff so the manual verification is auditable.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Application Domain Contract

### Overview

Add a small TypeScript module that describes garden bed inputs, stored records, allowed enum values, validation, and response mapping.

### Changes Required:

#### 1. Garden bed domain module

**File**: `src/lib/garden-beds.ts`

**Intent**: Keep product-data types and validation in `src/lib/` before wiring them into API routes, following the repository guideline to place shared product logic there.

**Contract**: Export a `WeedLevel` union for `low | medium | high`, a readonly list of allowed weed levels, a create-input type, a row/record type matching the database columns used by the app, and a JSON-safe response type if date/timestamp conversion is needed.

#### 2. Input validation

**File**: `src/lib/garden-beds.ts`

**Intent**: Ensure API handlers validate request data before calling Supabase.

**Contract**: Export a validation function for create requests. It must require a non-empty `name`, accept `weed_level` only from the allowed set, and reject invalid numeric values for `area_m2`, `estimated_minutes`, and `mulch_depth_cm`. Numeric fields must be actual JSON numbers, not numeric strings; future UI form handlers should convert form strings before calling this API. `last_weeded_at` may be omitted/null or a valid `YYYY-MM-DD` date string. Validate dates strictly with a date-format check plus calendar-validity check rather than loose `Date.parse` acceptance. Validation must mirror the SQL constraints: area must be positive when provided, estimated minutes must be positive when provided, and mulch depth must be non-negative when provided. Optional fields may be omitted or sent as `null` according to the database contract.

#### 3. Supabase payload mapping

**File**: `src/lib/garden-beds.ts`

**Intent**: Keep endpoint code small and reduce drift between request shape and database insert payload.

**Contract**: Export a mapping helper or clearly documented shape that combines validated input with the authenticated `user_id`. The helper must not accept `user_id` from client JSON.

### Success Criteria:

#### Automated Verification:

- `src/lib/garden-beds.ts` exports the domain types, weed-level constants, and validation helper.
- Validation rejects empty names, unknown weed levels, zero or negative area, negative numeric values, zero or negative estimated minutes, and invalid dates.
- `npx astro sync` succeeds after adding the module.
- `npm run lint` succeeds for the new module.

#### Manual Verification:

- Reviewer can compare `src/lib/garden-beds.ts` against the migration and confirm the fields align.
- Reviewer confirms the client cannot choose or override `user_id` through the create payload.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Minimal Protected API Smoke Endpoint

### Overview

Add authenticated `GET` and `POST` endpoints for garden beds. These endpoints verify Astro/Supabase integration and provide the first reusable backend surface for S-01.

### Changes Required:

#### 1. Garden beds API route

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Provide the smallest app-level smoke surface for listing and creating garden beds for the current user.

**Contract**: Export uppercase `GET` and `POST` Astro API handlers. Both handlers must create the Supabase client with the existing `createClient(context.request.headers, context.cookies)` helper first; if Supabase is not configured, return a 503 JSON response. After configuration is confirmed, both handlers must require `Astro.locals.user`; unauthenticated requests return a 401 JSON response.

#### 2. GET handler

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Verify authenticated select through RLS and provide a future list source for S-01.

**Contract**: Query `garden_beds` for the current user. Filtering by `user_id` in the query is allowed as defense-in-depth, but RLS must remain the authoritative isolation mechanism. Return `200` JSON as `{ beds: GardenBedResponse[] }` and avoid priority/suggested-date fields.

#### 3. POST handler

**File**: `src/pages/api/garden/beds.ts`

**Intent**: Verify authenticated insert through RLS while keeping creation behavior minimal.

**Contract**: Parse JSON request body, validate it with `src/lib/garden-beds.ts`, insert a row using the authenticated user's id, and return `201` JSON as `{ bed: GardenBedResponse }`. The API must not accept `id` from client JSON; row identity is generated by the database. Invalid input, malformed JSON, and non-object JSON values return `400` JSON as `{ error: string }`; unauthenticated requests return `401` JSON as `{ error: string }`; Supabase configuration failures return `503` JSON as `{ error: string }`; Supabase operation failures return safe `500` JSON as `{ error: string }`. Keep JSON response helpers local to `beds.ts` unless more JSON APIs are added.

#### 4. Middleware scope check

**File**: `src/middleware.ts`

**Intent**: Preserve route protection rules without adding dead protected routes.

**Contract**: Do not add `/garden` to `PROTECTED_ROUTES` in this phase because no `/garden` page is created. If implementation unexpectedly creates a page route, update `PROTECTED_ROUTES` in the same phase.

### Success Criteria:

#### Automated Verification:

- `src/pages/api/garden/beds.ts` exists and exports `GET` and `POST`.
- API handlers require authenticated user context before database access.
- POST validates input before calling Supabase.
- API handlers return 503 JSON when Supabase is not configured.
- `npx astro sync` succeeds.
- `npm run lint` succeeds.

#### Manual Verification:

- Anonymous `GET /api/garden/beds` returns 401 JSON.
- Logged-in user can `POST /api/garden/beds` with valid JSON and receive a 201 created bed.
- Logged-in user can `GET /api/garden/beds` and see their own created bed.
- A second logged-in user does not see the first user's bed.
- Malformed JSON and non-object JSON sent to `POST /api/garden/beds` return 400 JSON.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Verification and Handoff

### Overview

Document and run the verification path so F-01 can safely unlock S-01.

### Changes Required:

#### 1. Change documentation

**File**: `context/changes/user-scoped-garden-records/change.md`

**Intent**: Keep the change identity current and record any implementation notes that matter for future slices.

**Contract**: Ensure frontmatter status stays aligned with the workflow and notes mention any final verification caveats discovered during implementation. Do not move this change to `context/archive/`.

#### 2. Plan progress updates

**File**: `context/changes/user-scoped-garden-records/plan.md`

**Intent**: Use the canonical `## Progress` section as the source of truth while implementing phases.

**Contract**: Mark completed automated and manual checks in `## Progress` only, appending commit SHAs after implementation commits according to the 10x workflow.

#### 3. Handoff notes for S-01

**File**: `context/changes/user-scoped-garden-records/plan.md`

**Intent**: Make clear what the next slice can rely on and what it still must design.

**Contract**: Leave references in this plan showing that S-01 may rely on `garden_beds`, RLS ownership, and `GET/POST /api/garden/beds`, but must still design the queue UI, priority calculation, sorting rules, and suggested next-weeding date. Document the rollback posture for this first product table: before real user data exists, rollback may drop `public.garden_beds`; after user data exists, prefer a forward-fix or temporarily disabling API writes over dropping user-entered records.

### Success Criteria:

#### Automated Verification:

- `npx astro sync` succeeds.
- `npm run lint` succeeds.
- `npm run build` succeeds.
- `context/changes/user-scoped-garden-records/plan.md` and `plan-brief.md` both exist.

#### Manual Verification:

- SQL/RLS verification checklist has been run for two users and the exact commands or checklist results are recorded in the change notes.
- API smoke checklist has been run for anonymous, user A, and user B scenarios.
- Reviewer confirms no S-01 UI, priority algorithm, weed observations, plant list, or weeding-history scope slipped into F-01.
- Reviewer confirms the rollback posture is documented: before real user data exists, rollback may drop `public.garden_beds`; after user data exists, prefer forward-fix or temporarily disabling API writes over dropping user-entered records.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before closing the change.

---

## Testing Strategy

### Unit Tests:

- No test runner exists yet, so this plan does not introduce unit tests.
- Validation behavior should be manually exercised through direct function review and API requests until a test runner is added.

### Integration Tests:

- Apply the Supabase migration locally or in the target Supabase environment.
- Use SQL/RLS checks from authenticated/anon contexts to verify user ownership policies; do not rely on owner or service-role checks for RLS pass/fail results.
- Record the exact SQL/API smoke commands used, or their checklist results, in `context/changes/user-scoped-garden-records/change.md` before handoff.
- Use authenticated API requests to verify Astro route integration with Supabase and RLS.

### Manual Testing Steps:

1. Confirm anonymous requests to `GET /api/garden/beds` and `POST /api/garden/beds` return 401 JSON.
2. Sign in as user A and create a bed with valid JSON including `name`, `weed_level`, and optional raw priority inputs.
3. Confirm user A can list the created bed.
4. Sign in as user B and confirm user B cannot list user A's row.
5. Try invalid POST payloads: empty name, unknown weed level, negative area, zero area, zero estimated minutes, negative mulch depth, invalid date, malformed JSON, and non-object JSON.
6. Confirm Supabase configuration failures return 503 JSON when `createClient(...)` returns `null`.
7. Run `npx astro sync`, `npm run lint`, and `npm run build` before handoff.

## Performance Considerations

Expected MVP scale is small and low-QPS. The `garden_beds` table should still include a per-user listing index so future queue reads do not require full-table scans. Do not add priority-specific computed indexes until S-01 defines the sorting logic.

## Migration Notes

This is the first product-data migration, so no existing garden records need backfill. Rollback during development can drop `public.garden_beds` and related trigger/policies, but production rollback should be handled carefully because deleting the table would delete user-entered bed records.

## References

- Roadmap F-01: `context/foundation/roadmap.md`
- Product requirements: `context/foundation/prd.md`
- Supabase client helper: `src/lib/supabase.ts`
- Auth middleware: `src/middleware.ts`
- Existing API route pattern: `src/pages/api/auth/signin.ts`, `src/pages/api/auth/signup.ts`, `src/pages/api/auth/signout.ts`
- Change identity: `context/changes/user-scoped-garden-records/change.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Contract and RLS

#### Automated

- [x] 1.1 Supabase migration file exists under `supabase/migrations/` and contains the `garden_beds` table definition. — baed9f3
- [x] 1.2 Migration defines ownership constraints, positive-value checks, weed-level check, RLS enablement, and authenticated select/insert policies. — baed9f3
- [x] 1.3 Migration can be applied locally or reviewed with Supabase CLI without SQL syntax errors. — baed9f3

#### Manual

- [x] 1.4 SQL/RLS smoke test confirms user A can insert and select their own bed. — baed9f3
- [x] 1.5 SQL/RLS smoke test confirms user B cannot select user A's bed. — baed9f3
- [x] 1.6 SQL/RLS smoke test confirms unauthenticated access cannot read from or insert into `garden_beds`. — baed9f3
- [x] 1.7 Exact SQL/RLS smoke commands or checklist results are recorded in the change notes before handoff. — baed9f3

### Phase 2: Application Domain Contract

#### Automated

- [x] 2.1 `src/lib/garden-beds.ts` exports the domain types, weed-level constants, and validation helper. — 88daa71
- [x] 2.2 Validation rejects empty names, unknown weed levels, zero or negative area, negative numeric values, zero or negative estimated minutes, and invalid dates. — 88daa71
- [x] 2.3 `npx astro sync` succeeds after adding the module. — 88daa71
- [x] 2.4 `npm run lint` succeeds for the new module. — 88daa71

#### Manual

- [x] 2.5 Reviewer can compare `src/lib/garden-beds.ts` against the migration and confirm the fields align. — 88daa71
- [x] 2.6 Reviewer confirms the client cannot choose or override `user_id` through the create payload. — 88daa71

### Phase 3: Minimal Protected API Smoke Endpoint

#### Automated

- [x] 3.1 `src/pages/api/garden/beds.ts` exists and exports `GET` and `POST`. — 95e6b16
- [x] 3.2 API handlers require authenticated user context before database access. — 95e6b16
- [x] 3.3 POST validates input before calling Supabase. — 95e6b16
- [x] 3.4 API handlers return 503 JSON when Supabase is not configured. — 95e6b16
- [x] 3.5 `npx astro sync` succeeds. — 95e6b16
- [x] 3.6 `npm run lint` succeeds. — 95e6b16

#### Manual

- [x] 3.7 Anonymous `GET /api/garden/beds` returns 401 JSON. — 95e6b16
- [x] 3.8 Logged-in user can `POST /api/garden/beds` with valid JSON and receive a 201 created bed. — 95e6b16
- [x] 3.9 Logged-in user can `GET /api/garden/beds` and see their own created bed. — 95e6b16
- [x] 3.10 A second logged-in user does not see the first user's bed. — 95e6b16
- [x] 3.11 Malformed JSON and non-object JSON sent to `POST /api/garden/beds` return 400 JSON. — 95e6b16

### Phase 4: Verification and Handoff

#### Automated

- [x] 4.1 `npx astro sync` succeeds. — 086cede
- [x] 4.2 `npm run lint` succeeds. — 086cede
- [x] 4.3 `npm run build` succeeds. — 086cede
- [x] 4.4 `context/changes/user-scoped-garden-records/plan.md` and `plan-brief.md` both exist. — 086cede

#### Manual

- [x] 4.5 SQL/RLS verification checklist has been run for two users and the exact commands or checklist results are recorded in the change notes. — 086cede
- [x] 4.6 API smoke checklist has been run for anonymous, user A, and user B scenarios. — 086cede
- [x] 4.7 Reviewer confirms no S-01 UI, priority algorithm, weed observations, plant list, or weeding-history scope slipped into F-01. — 086cede
- [x] 4.8 Reviewer confirms the rollback posture is documented: before real user data exists, rollback may drop `public.garden_beds`; after user data exists, prefer forward-fix or temporarily disabling API writes over dropping user-entered records. — 086cede
