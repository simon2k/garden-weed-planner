---
change_id: user-scoped-garden-records
title: User scoped garden records
status: implementing
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
