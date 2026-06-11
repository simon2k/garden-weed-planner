---
change_id: testing-priority-foundation
title: Testing priority foundation
status: impl_reviewed
created: 2026-06-07
updated: 2026-06-11
archived_at: null
---

## Notes

- Implementation review accepted the Stryker mutation-testing setup as exploratory follow-up tooling, not part of the required Phase 1 Vitest gate.
- Stryker is intentionally not wired into CI yet; a future change should define script naming, gate policy, report retention, and whether mutation reports are CI artifacts instead of committed files.
