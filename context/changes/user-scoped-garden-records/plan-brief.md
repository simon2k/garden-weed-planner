# User Scoped Garden Records — Plan Brief

> Full plan: `context/changes/user-scoped-garden-records/plan.md`

## What & Why

Build the F-01 foundation for Garden Weed Planner: a minimal user-scoped garden bed data contract. This is needed before S-01 can add a priority queue, because user records must be durable and isolated before product UI depends on them.

## Starting Point

Supabase auth, SSR client creation, middleware user loading, and auth API routes already exist. Product data tables, garden migrations, and garden APIs do not exist yet.

## Desired End State

A logged-in user can create and list only their own garden bed records through minimal `GET` and `POST` API endpoints. Supabase RLS enforces isolation, while TypeScript domain contracts and validation keep application writes safe. S-01 can then build the queue UI and priority algorithm on top of this foundation.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Smoke surface | Minimal protected API endpoint | Verifies real Astro ↔ Supabase integration and gives S-01 a reusable starting point. |
| Table scope | `garden_beds` only | Keeps F-01 foundational and avoids prematurely modeling observations/history. |
| Priority data | Store raw inputs, not computed priority | Prevents algorithm lock-in before S-01 defines calculation rules. |
| Weed level | `low \| medium \| high` | Simple MVP-friendly contract that is easy to validate and display. |
| Mulch | `mulch_depth_cm numeric` | Preserves precise data for later priority calculation. |
| API write scope | `GET + POST` | Confirms both select and insert through RLS without building full UI. |
| Verification | SQL policy tests + API smoke checklist recorded in change notes | Checks both database isolation and application integration, and keeps manual evidence auditable. |
| TS contract | Handwritten domain types + validators | Fast and readable for MVP; avoids adding generated-type workflow now. |
| Protected route | Add `/garden` only if a page is created | Avoids dead middleware entries; API endpoints enforce auth directly. |

## Scope

**In scope:**

- `garden_beds` Supabase migration; create `supabase/migrations/` first if absent.
- RLS policies for user-owned select/insert only; update/delete policies are deferred until slices expose those behaviors.
- Raw priority input fields: area, last weeded date, weed level, estimated minutes, mulch depth.
- `src/lib/garden-beds.ts` types and validation, including actual JSON-number inputs only and strict `YYYY-MM-DD` calendar-valid date checks.
- `GET /api/garden/beds` and `POST /api/garden/beds` smoke endpoints.
- SQL/RLS and API smoke verification steps, with exact commands or checklist results recorded in `change.md` before handoff.

**Out of scope:**

- Garden bed UI page.
- Priority algorithm or suggested next-weeding date.
- Weed observations, plant lists, and weeding history.
- Team/shared access model.
- Generated Supabase types.
- New automated test runner.

## Architecture / Approach

The database owns user isolation through RLS on `garden_beds`. The app owns input validation in `src/lib/garden-beds.ts`. The API route uses existing Supabase SSR client patterns and `Astro.locals.user` to expose a tiny authenticated JSON surface for create/list smoke checks.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Database Contract and RLS | `garden_beds` migration, constraints, indexes, RLS policies | Policy mistakes could leak or block user data. |
| 2. Application Domain Contract | Types, constants, validation, payload mapping | Drift between TS contract and SQL schema. |
| 3. Minimal Protected API Smoke Endpoint | Authenticated `GET + POST /api/garden/beds` | Scope creep into S-01 feature behavior. |
| 4. Verification and Handoff | SQL/API smoke checklist, recorded evidence, and final gates | Manual verification may be skipped or under-documented. |

**Prerequisites:** Supabase project/local stack configured; existing auth remains functional.
**Estimated effort:** ~2-3 focused sessions across 4 phases.

## Open Risks & Assumptions

- No automated test runner exists, so RLS/API verification is partly manual and must be recorded in change notes.
- Handwritten TypeScript types can drift from SQL until a generated-type workflow is introduced.
- `mulch_depth_cm` is precise for algorithms but may need UI presets later to reduce user friction.

## Success Criteria (Summary)

- Users can only create/list their own `garden_beds` records.
- Invalid garden bed input is rejected before Supabase writes, including numeric strings for numeric fields and invalid calendar dates.
- `npx astro sync`, `npm run lint`, and `npm run build` pass before handoff.
