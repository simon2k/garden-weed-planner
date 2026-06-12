# Bed Plant List — Plan Brief

> Full plan: `context/changes/bed-plant-list/plan.md`

## What & Why

Build roadmap S-02: users can maintain a list of plants planted on each garden bed. This gives helpful context while reviewing the weeding priority queue without changing the queue algorithm.

## Starting Point

F-01 created `garden_beds` with user ownership and RLS. S-01 added the protected `/garden` page, queue UI, priority helpers, and `GET/POST /api/garden/beds`; no plant persistence or plant UI exists yet.

## Desired End State

On `/garden`, a user can expand a bed card, load that bed's plants, and add a plant with a required name plus optional planted year, quantity, current height, and current width. Plant data is isolated per user and does not alter priority score, suggested date, or queue order.

## Key Decisions Made

| Decision          | Choice                                                                | Why                                                                                     |
| ----------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Feature scope     | Add + list only                                                       | Smallest useful FR-003 slice; edit/delete can come later.                               |
| Plant fields      | `name` + optional `planted_year`, `quantity`, `height_cm`, `width_cm` | Captures useful planting context while deferring notes/reminders.                       |
| Persistence       | Normalized `garden_bed_plants` table                                  | Clean one-to-many model and safer future CRUD than JSON on `garden_beds`.               |
| Priority behavior | Display-only context                                                  | Keeps S-02 separate from priority-scoring work planned elsewhere.                       |
| UI pattern        | Expandable plant section per queue card                               | Keeps the queue readable while putting context next to the decision.                    |
| API shape         | Nested `GET/POST /api/garden/beds/[bedId]/plants`                     | Avoids bloating the existing priority queue API.                                        |
| Size semantics    | Current height/width in cm                                            | Matches the user's desired present-state context; future edits can refresh stale sizes. |
| Duplicates        | Allow duplicates                                                      | Fast MVP behavior; avoids premature normalization and fuzzy matching.                   |

## Scope

**In scope:**

- `garden_bed_plants` migration with RLS.
- Plant validation and response helpers for name, planted year, quantity, current height, and current width.
- Nested authenticated add/list API.
- Expandable plant section in existing `/garden` queue cards.
- Manual and command-based verification.

**Out of scope:**

- Edit/delete plant entries.
- Duplicate blocking.
- Plant notes/reminders/warnings; notes are deferred for a later reminder/warning feature.
- Plant-aware priority scoring or sorting.
- Weed observations, weeding history, or bed update/delete behavior.
- Separate plant management page.

## Architecture / Approach

`garden_beds` remains the source for queue data. `garden_bed_plants` becomes a child table keyed by `bed_id` and server-controlled `user_id`, with optional structured fields for planted year, quantity, and current dimensions in centimeters. The existing queue API stays unchanged; the React queue card lazy-loads plant context through nested plant endpoints only when a bed is expanded.

## Phases at a Glance

| Phase                                 | What it delivers                           | Key risk                                                           |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| 1. Database Contract and RLS          | Plant table, constraints, indexes, RLS     | Parent-bed ownership policy mistakes.                              |
| 2. Plant Domain Helpers               | Types, validation, insert/response mapping | Accidentally accepting client-controlled ownership fields.         |
| 3. Nested Plant API                   | Authenticated add/list endpoints           | Leaking non-owned bed existence.                                   |
| 4. Expandable Plant UI                | Expand, list, add plant from queue cards   | Making queue cards too noisy or changing queue state accidentally. |
| 5. Final Verification and Scope Guard | Gates and smoke tests                      | Scope creep into priority, edit/delete, S-03, or S-04.             |

**Prerequisites:** F-01 and S-01 implemented; Supabase env configured for API/manual smoke tests.  
**Estimated effort:** ~2-3 focused sessions across 5 phases.

## Open Risks & Assumptions

- RLS policy should be manually smoke-tested because automated tests are not configured.
- Lazy-loading plants adds per-expanded-card requests; acceptable for MVP scale.
- Duplicate plant names are allowed intentionally and may need refinement after real use.
- Current height/width may become stale because edit behavior is out of scope for S-02.

## Success Criteria (Summary)

- User can expand a bed on `/garden`, add plants with optional structured details, and see them listed.
- Cross-user plant access is blocked.
- Existing bed queue priority labels, scores, suggested dates, and order remain unchanged.
