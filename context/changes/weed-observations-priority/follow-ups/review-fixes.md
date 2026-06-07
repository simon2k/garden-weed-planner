# Implementation Review Follow-ups

Source report: `context/changes/weed-observations-priority/reviews/impl-review.md`

- [x] F1 — Nested observation route does not verify parent bed ownership — accepted Fix B / documented RLS-first behavior
- [x] F2 — Queue silently ignores observation query failures — fixed with 500 error response
- [x] F3 — Queue loads all observations before applying 60-day decay — fixed with DB-side 60-day filter
