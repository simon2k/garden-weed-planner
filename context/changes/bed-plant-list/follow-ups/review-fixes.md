# Implementation Review Follow-ups

Source review: `context/changes/bed-plant-list/reviews/impl-review.md`

Triage decisions:

- [x] F1 — Invalid bedId can return 500 — fixed via Fix A
- [x] F2 — Plant list endpoint is unbounded — skipped, acceptable for MVP scale
- [x] F3 — Plant input IDs use bedName — skipped, accepted as low-impact
- [x] F4 — Time-dependent DB check is intentional but worth noting — skipped, accepted as intentional
