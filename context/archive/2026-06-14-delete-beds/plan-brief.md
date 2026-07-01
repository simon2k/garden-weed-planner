# Delete Beds — Plan Brief

> Full plan: `context/changes/delete-beds/plan.md`

## What & Why

Add one-bed deletion to the existing `/garden` priority queue. This lets users clean up beds they no longer want to track while preserving the app’s user-isolated data model.

## Starting Point

The app already supports authenticated garden-bed creation/listing plus child records for plants, weed observations, and weeding history. Child tables already cascade on `garden_beds` deletion, but there is no delete policy, delete API, or delete UI yet.

## Desired End State

A user can click Delete on a bed card, see inline confirmation, confirm, and immediately see the card removed. The server deletes only the current user’s bed, returns non-leaking `404` behavior for missing/not-owned IDs, and the database cascades child deletion.

## Key Decisions Made

| Decision                   | Choice                                         | Why                                                                                  |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Delete model               | Hard delete with cascade                       | Existing child FKs already support this and it is the simplest MVP cleanup behavior. |
| Confirmation UX            | Inline card confirmation                       | Avoids accidental deletion without adding modal/browser-dialog awkwardness.          |
| Post-delete UI             | Local removal and success message              | Gives fast feedback and avoids resetting the whole queue.                            |
| API shape                  | `DELETE /api/garden/beds/[bedId]`              | Standard REST shape for one resource and keeps collection route focused.             |
| Child data                 | Rely on DB cascade, explain in UI              | Keeps app code simple while making destructive impact visible to users.              |
| Missing/not-owned behavior | `404 Garden bed not found`                     | Avoids leaking whether another user’s bed exists.                                    |
| Test scope                 | Existing gate plus manual smoke                | Matches current test foundation without inventing weak API/RLS unit tests.           |
| Out of scope               | No undo, bulk delete, or child-specific delete | Keeps this change narrow and reviewable.                                             |

## Scope

**In scope:**

- Supabase migration adding owned delete policy for `garden_beds`.
- `DELETE /api/garden/beds/[bedId]` route.
- Inline delete confirmation in `GardenQueue` cards.
- Local queue removal and cleanup of per-bed expanded/child state.
- Full project validation gate and manual delete/cascade smoke checks.

**Out of scope:**

- Soft delete/archive/restore/undo.
- Bulk delete.
- Separate child record deletion/editing.
- New API/Supabase integration test framework.
- Priority algorithm or mark-weeding changes.

## Architecture / Approach

The database owns persistence and cascading child deletion. The API owns authentication and non-leaking owned deletion. The React island owns inline confirmation and local state cleanup after success, including removing stale expanded and child-state entries keyed by the deleted bed ID.

## Phases at a Glance

| Phase                       | What it delivers                      | Key risk                                                           |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| 1. Database Delete Policy   | RLS permission to delete own beds     | Accidentally widening access beyond owned rows.                    |
| 2. Delete Bed API           | Authenticated one-bed delete endpoint | Returning success for not-owned/missing IDs or leaking ownership.  |
| 3. Garden Queue UI          | Inline confirm and local removal      | Leaving stale per-bed child/expanded state after delete.           |
| 4. Verification and Handoff | Full gate and manual cascade smoke    | Cascade/RLS behavior is manual, not covered by current unit tests. |

**Prerequisites:** Existing `/garden` queue, Supabase migrations applied, authenticated local/dev environment for manual smoke.  
**Estimated effort:** ~1-2 focused implementation sessions across 4 phases.

## Open Risks & Assumptions

- Hard delete is irreversible; the inline confirmation copy must make child data loss clear.
- Cascade behavior depends on existing deployed migrations matching the repository migrations.
- API/RLS behavior remains manually verified until the project adds Supabase/API integration tests.

## Success Criteria (Summary)

- A user can delete their own bed from `/garden` only after inline confirmation.
- Deleted beds disappear locally and associated child data is removed by cascade.
- Missing/not-owned deletion does not leak data, and `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build` pass.
