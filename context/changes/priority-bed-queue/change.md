---
change_id: priority-bed-queue
title: Priority Bed Queue
status: plan_reviewed
created: 2026-06-02
updated: 2026-06-02
archived_at: null
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
