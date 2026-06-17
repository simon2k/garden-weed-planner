---
change_id: test-plan-refresh-2026-06-15
title: Refresh test plan after E2E rollout
status: implementing
created: 2026-06-15
updated: 2026-06-16
archived_at: null
---

## Notes

Open a change folder for refreshing context/foundation/test-plan.md. This is a refresh change, not an in-place edit.

Refresh trigger:

- Existing test plan last reviewed 2026-06-07.
- Since then Playwright E2E was added, pre-push now runs unit + E2E, and risk #1 has browser coverage.
- User-stated new concern: the queue shows the correct first bed for basic inputs, but weed observations may change pressure and sort the queue incorrectly.

Current test-base profile:

- Sparse but no longer empty: Vitest configured for src/\*_/_.test.ts and Playwright configured for e2e/\*.spec.ts.
- Existing tests: src/lib/garden-beds.test.ts, src/lib/weed-observations.test.ts, src/lib/weeding-events.test.ts, e2e/seed.spec.ts, e2e/priority-queue.spec.ts.
- Current gates: npm run test, npm run test:e2e, npm run test:pre-push = unit + E2E.

Hot-spot scan, accepted scope src/ over last 30 days:

- 28 commits touching src/.
- Top dirs: src/pages/api (19), src/components/garden (8), src/components/auth (6), src/lib/garden-beds.ts (4).
- New E2E/test-config commits also touched e2e/, playwright.config.ts, and package.json.

Refresh interview summary:

- Q1 worry: weed observations may cause priority pressure/sorting to point the queue to the wrong bed.
- Q2 burned before: no concrete incident; this is a hypothesis rather than a past failure.
- Q3 low-confidence area: priority scoring/date semantics in src/lib/garden-beds.ts.
- Q4 biggest gap: no test proves weed observations affect queue ordering in the UI.
- Q5 negative space unchanged: marketing/static pages, broad screenshot/snapshot tests, base shadcn/ui primitives.

Likely refresh changes to plan:

- Update §4 Stack to reflect Vitest + Playwright now exist.
- Update §5 Quality Gates to reflect npm run test:e2e and pre-push unit+E2E where appropriate.
- Update §6 cookbook with the shipped E2E seed and priority queue patterns.
- Reassess §2/§3 around risk #1/#5: add or emphasize observation-driven queue ordering as the next gap.
- Preserve the principle that risks are scenarios, not code locations; source citations should remain evidence-only.

After creating the folder, follow the downstream continuation rule.
