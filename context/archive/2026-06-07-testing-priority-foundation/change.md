---
change_id: testing-priority-foundation
title: Testing priority foundation
status: archived
created: 2026-06-07
updated: 2026-06-12
archived_at: 2026-06-12T21:33:44Z
---

## Notes

- Implementation review accepted the Stryker mutation-testing setup as exploratory follow-up tooling, not part of the required Phase 1 Vitest gate.
- Stryker is intentionally not wired into CI yet; a future change should define script naming, gate policy, report retention, and whether mutation reports are CI artifacts instead of committed files.
