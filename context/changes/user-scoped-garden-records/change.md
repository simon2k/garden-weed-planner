---
change_id: user-scoped-garden-records
title: User scoped garden records
status: implemented
created: 2026-06-01
updated: 2026-06-01
archived_at: null
---

## Notes

F-01 z context/foundation/roadmap.md

### Phase 1 manual SQL/RLS smoke results — 2026-06-01

Result reported by reviewer: tested manually, works.

Checklist covered:
- User A can insert and select their own `garden_beds` row.
- User B cannot select user A's row.
- Unauthenticated/anonymous access cannot read from or insert into `garden_beds`.

Recommended command path used/provided for auditability:
- Start local Supabase with `npx supabase start`.
- Connect with `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"`.
- Simulate authenticated users with `set local role authenticated` and distinct `request.jwt.claim.sub` values.
- Simulate anonymous access with `set local role anon`.

### Phase 2 manual domain contract review — 2026-06-01

Result reported by reviewer:
- Schema alignment approved by comparing `src/lib/garden-beds.ts` with `supabase/migrations/20260601120000_create_garden_beds.sql`.
- Client ownership override check confirmed by code review: `validateCreateGardenBedInput` does not accept/read `user_id`, and `toGardenBedInsertPayload(input, userId)` requires the authenticated server-provided user id.

### Phase 3 manual API smoke results — 2026-06-01

Result reported by reviewer: Phase 3 manual checks passed.

Checklist covered:
- Anonymous `GET /api/garden/beds` returns 401 JSON.
- Logged-in user can `POST /api/garden/beds` with valid JSON and receive a 201 created bed.
- Logged-in user can `GET /api/garden/beds` and see their own created bed.
- A second logged-in user does not see the first user's bed.
- Malformed JSON and non-object JSON sent to `POST /api/garden/beds` return 400 JSON.

Implementation note: initial remote smoke test failed with `Could not find the table 'public.garden_beds' in the schema cache`; after applying the migration to the target Supabase database, the Phase 3 API smoke checks passed.

### Handoff notes for S-01 — 2026-06-01

S-01 may rely on:
- `public.garden_beds` existing with per-user ownership through `user_id` and RLS.
- Authenticated users being able to select and insert only their own garden bed rows.
- Handwritten domain contracts and validation in `src/lib/garden-beds.ts`.
- Minimal smoke API endpoints at `GET /api/garden/beds` and `POST /api/garden/beds`.

S-01 must still design:
- Garden bed queue UI and route structure.
- Priority calculation and sorting rules.
- Suggested next-weeding date behavior.
- Any update/delete behavior and matching RLS policies.

Rollback posture:
- Before real user data exists, rollback may drop `public.garden_beds` and its related policies/function/trigger.
- After real user data exists, prefer a forward-fix or temporarily disabling API writes over dropping user-entered records.

### Phase 4 final manual verification — 2026-06-01

Result reported by reviewer: final manual checks confirmed.

Checklist covered:
- SQL/RLS verification checklist was run for two users and results are recorded in this change note.
- API smoke checklist was run for anonymous, user A, and user B scenarios and results are recorded in this change note.
- Reviewer confirmed no S-01 UI, priority algorithm, weed observations, plant list, or weeding-history scope slipped into F-01.
- Rollback posture is documented in the S-01 handoff notes.
