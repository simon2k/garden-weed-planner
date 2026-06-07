# Weed Observations Priority — Plan Brief

> Full plan: `context/changes/weed-observations-priority/plan.md`
> Research: `context/changes/weed-observations-priority/research.md`

## What & Why

Build S-03: manual weed observations that affect the garden bed priority queue. This matters because the PRD says priority is not only last-weeding date; specific weed observations, severity, coverage, and problematic weed traits should make a bed need attention sooner.

## Starting Point

The app already has authenticated garden beds, a protected `/garden` queue, computed priority in `src/lib/garden-beds.ts`, and a nested plant child-resource pattern. What is missing is an observation table/API/UI and observation-aware priority scoring.

## Desired End State

A user can add a weed observation from a broad Polish catalog, adjust Polish risk-trait checkboxes, and see the queue refresh immediately. Priority score, suggested next-weeding date, and a short Polish explanation update based on a 60-day decaying observation-pressure algorithm.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Observation storage | Append-only child table | Mirrors plant pattern and avoids stale persisted priority fields. | Research |
| Priority integration | Compute at queue-list time | Keeps `GET /api/garden/beds` as the single queue source. | Research |
| Weed identity | Broad Polish catalog 20+ entries | Better UX than free text only and supports defaults. | Plan |
| Risk traits | Polish checkboxes | Directly feeds transparent scoring. | Plan |
| Coverage | `low | medium | high` | Simpler MVP input than percentages. | Plan |
| Observation expiry | 60-day decay | Prevents stale observations from dominating while preserving recent risk. | Research / Plan |
| UI feedback | Short Polish explanation | Builds trust in why date/priority changed. | Plan |
| Submit behavior | Reload full queue | Sort order and suggested date may change after one observation. | Research / Plan |

## Scope

**In scope:**

- Supabase migration/RLS for `garden_bed_weed_observations`.
- Polish weed catalog and observation validation module.
- Observation pressure algorithm with 60-day decay.
- Nested add/list API for observations.
- Queue API extension to include observation-aware priority fields.
- Garden UI section for adding/listing observations and showing impact reasons.

**Out of scope:**

- Edit/delete observations.
- Marking beds as weeded or resetting observation impact after weeding.
- Photo recognition.
- Persisted priority columns on `garden_beds`.
- Full calendar planner or treatment/herbicide advice.

## Architecture / Approach

Data flows from `garden_bed_weed_observations` through a nested bed API and through `GET /api/garden/beds`. The queue API summarizes observations per bed, `src/lib/garden-beds.ts` computes observation pressure and adjusted dates, and the React island displays the result and reloads the whole queue after new observations.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Database Contract and RLS | Secure observation table | RLS/ownership mistakes |
| 2. Domain Model and Polish Catalog | Types, validation, catalog | Catalog defaults may be too broad or inaccurate |
| 3. Priority Algorithm | Observation-aware score/date/reasons | Score bands may need tuning |
| 4. API Integration | Nested routes + queue summaries | Extra query must stay user-scoped |
| 5. Garden UI Integration | Add/list observations and show impact | `GardenQueue.tsx` complexity grows |
| 6. Final Verification | Gates and scope guard | Missing cross-user/manual smoke checks |

**Prerequisites:** F-01/S-01 existing bed queue; Supabase local/project access for migration/RLS smoke tests.
**Estimated effort:** ~3-5 focused sessions across 6 phases.

## Open Risks & Assumptions

- The broad Polish weed catalog is useful but may need gardener review after implementation.
- The initial scoring weights are transparent heuristics, not agronomic truth; tune after real use.
- Without S-04, old observations decay by time only, not by explicit “weeded” reset.

## Success Criteria (Summary)

- User can add/list weed observations per bed from `/garden`.
- High-risk observations visibly change priority score, suggested date, reasons, and possibly queue order.
- Cross-user access is blocked by both API ownership checks and RLS.
