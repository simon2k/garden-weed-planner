# Mark Bed Weeded — Plan Brief

> Full plan: `context/changes/mark-bed-weeded/plan.md`

## What & Why

Build S-04: users can mark a bed as weeded, record required work duration, optionally add a note, and see that bed drop in priority. This closes the priority queue loop and creates historical data for future stats/predictions.

## Starting Point

The app already has `/garden`, `garden_beds.last_weeded_at`, priority scoring, plants, and weed observations. It does not yet have bed update APIs, weeding history, or logic to ignore weed observations that happened before a completed weeding.

## Desired End State

Each bed card has a mark-weeding form with date defaulted to today, required duration minutes, and optional note. Saving inserts a weeding event, updates the parent bed to `last_weeded_at = selected date` and `weed_level = low`, reloads the queue, and makes history available in an expandable per-bed section. Observations remain stored but only post-weeding observations affect current priority.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Completion model | Weeding event history plus parent bed update | Preserves work history for future stats while keeping queue summary current. |
| Date input | Choose date, default today | Supports backdating while keeping the common case fast. |
| Duration | Required positive minutes | Ensures every event can support later workload analysis. |
| Weed level reset | Set `weed_level` to `low` | A freshly weeded bed should drop in urgency. |
| API shape | Dedicated `PATCH /api/garden/beds/[bedId]/mark-weeded` | Narrow action endpoint avoids broad edit-bed scope. |
| History UI | Separate expandable section per bed | Keeps history discoverable without crowding the card. |
| Observation reset | Ignore observations dated on/before latest weeding | Keeps old severe observations historical without keeping current priority urgent. |
| Queue refresh | Reload from API after save | Server remains source of truth for priority and ordering. |

## Scope

**In scope:**

- `garden_bed_weeding_events` table with RLS, constraints, indexes, and timestamp trigger.
- Owned-bed update policy for `garden_beds`.
- Mark-weeding validation/domain helpers.
- Dedicated mark-weeding API and history list API.
- Queue priority filtering relative to `last_weeded_at`.
- Card-level mark-weeding UI and expandable history UI.

**Out of scope:**

- Full bed editing.
- Editing/deleting weeding events.
- Charts, stats, predictions, or reports.
- Deleting/archiving weed observations.
- Bulk mark-weeding.

## Architecture / Approach

Use a normalized child table for durable events and keep parent `garden_beds` as the queue summary. The UI submits a narrow action request; the server inserts the event, updates the parent bed, and the React island reloads the queue. Weeding history is lazy-loaded through a separate nested endpoint, matching plants/observations.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Database Persistence and RLS | Event table and bed update capability | RLS/update policy must not widen cross-user access. |
| 2. Domain Helpers and Contracts | Validated event/action payloads | Date and duration semantics must be strict. |
| 3. Mark-Weeded and History APIs | Save action and list history endpoints | Partial event/bed update failure needs safe handling. |
| 4. Priority Reset Semantics | Old observations stop affecting current priority | Filtering must not hide historical observation display. |
| 5. Garden Queue UI | Mark form and expandable history | Card is already busy; UX must stay clear. |
| 6. Final Verification | Sync, lint, build, smoke checks | Manual auth/RLS testing is required. |

**Prerequisites:** Existing S-01 queue, authenticated Supabase setup, and current garden bed table.  
**Estimated effort:** ~2-3 implementation sessions across 6 phases.

## Open Risks & Assumptions

- Supabase route code may not use a database transaction; implementation must handle insert/update partial failure before showing success.
- No automated test runner exists, so smoke tests are important.
- The UI card may need careful layout to avoid control overload.

## Success Criteria (Summary)

- User can record a weeding event with date, required duration, and optional note.
- The bed drops in queue priority after save and old observations no longer drive current urgency.
- Weeding history is visible per bed and remains user-isolated by RLS/auth.
