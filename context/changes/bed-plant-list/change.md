---
change_id: bed-plant-list
title: Bed plant list from roadmap S-02
status: implementing
created: 2026-06-05
updated: 2026-06-05
archived_at: null
---

## Notes

z S-02 z context/foundation/roadmap.md

## Validation Evidence

### Automated — 2026-06-05

- `npx astro sync` — passed.
- `npm run lint` — passed.
- `npm run build` — passed.

### Manual Smoke — 2026-06-05

- Phase 1 RLS smoke test passed after applying the plant migration locally.
- Phase 3 API smoke tests passed for own-bed list/create, non-owned bed not-found behavior, and existing bed API compatibility.
- Phase 4 browser UI checks passed after local migration was applied: expand/list/add/collapse behavior works and plant context does not alter queue priority/order.

## Scope Guard

Confirmed S-02 scope only: add/list plant context for beds. No edit/delete plant behavior, weed observations, weeding history, bed update/delete behavior, plant-aware priority scoring, or queue API breaking changes were introduced.
