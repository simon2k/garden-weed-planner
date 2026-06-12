---
change_id: priority-bed-queue
title: Priority Bed Queue
status: archived
created: 2026-06-02
updated: 2026-06-12
archived_at: 2026-06-12T21:19:28Z
---

## Notes

S-01 from `context/foundation/roadmap.md`: user can add garden beds with basic data and see a queue sorted by urgency with a suggested next-weeding date.

Planning decisions captured 2026-06-02:

- Priority uses a rule-based score.
- Suggested next-weeding date uses fixed intervals by weed level.
- Incomplete optional inputs are allowed, but queue output marks degraded confidence.
- UI lives on protected `/garden` route with a React island.
- Priority/date/confidence computation lives in pure helpers in `src/lib/garden-beds.ts` and is not persisted.
- Queue sorting is priority, then suggested date, then weed level, then created date.
- Manual verification covers auth, adding three beds, ordering, suggested dates, confidence, and user isolation.

## Manual Smoke Evidence

Final S-01 smoke approved by reviewer on 2026-06-02:

- Anonymous `/garden` request redirects to `/auth/signin`.
- Logged-in user A can add low, medium, and high weed-level beds and see them sorted by priority.
- Suggested dates follow the fixed interval table for each weed level.
- A bed with missing optional inputs remains visible with degraded confidence.
- Logged-in user B does not see user A's beds.
- Reviewer confirmed no S-02 plant list, S-03 weed observations, S-04 weeding-history, or update/delete scope slipped into S-01.
