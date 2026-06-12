<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Mark Bed Weeded Implementation Plan

- **Plan**: context/changes/mark-bed-weeded/plan.md
- **Scope**: Phases 1–6 of 6
- **Date**: 2026-06-07
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | WARNING |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Verification

- `npx astro sync` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
- Working tree clean after verification — PASS

## Findings

### F1 — Older backfilled event can regress bed priority

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/garden/beds/[bedId]/mark-weeded.ts:49
- **Detail**: The endpoint always sets `last_weeded_at` to the submitted event date. If a user later records an older/backfilled event, the bed summary can move backward and priority becomes inaccurate.
- **Fix A ⭐ Recommended**: Update `last_weeded_at` with max/current-latest semantics.
  - Strength: Preserves backfilled history while keeping queue state correct.
  - Tradeoff: Needs either a fetch-before-update or DB-side logic.
  - Confidence: HIGH — plan refers to latest `last_weeded_at`.
  - Blind spot: Does not fully solve two-step transaction safety by itself.
- **Decision**: FIXED via Fix A — conditional bed update preserves latest `last_weeded_at`; `npm run lint` passed after the patch.

### F2 — Event insert and bed update are not transactional

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architecture
- **Location**: src/pages/api/garden/beds/[bedId]/mark-weeded.ts:37
- **Detail**: The event insert can succeed while the bed update fails. The UI will not show success, but persisted history and queue summary can diverge.
- **Fix A ⭐ Recommended**: Move insert plus summary update into a Postgres RPC transaction.
  - Strength: Makes the logical operation atomic.
  - Tradeoff: Adds migration/API complexity.
  - Confidence: MED — best long-term fix, but bigger than a route patch.
  - Blind spot: Requires checking Supabase RPC typing and migration style.
- **Fix B**: Add compensating delete or stronger failure recovery in the route.
  - Strength: Smaller MVP patch.
  - Tradeoff: Still weaker than real transaction semantics.
  - Confidence: MED — acceptable short-term, but more edge cases.
  - Blind spot: RLS/delete policy may be needed for compensation.
- **Decision**: FIXED via Fix A — added transactional `public.mark_garden_bed_weeded` RPC and refactored the API route to use it; full gate (`npx astro sync`, `npm run lint`, `npm run build`) passed.

### F3 — Existing `last_weeded_at` create validation still accepts future dates

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/garden-beds.ts:196
- **Detail**: The known lesson says “last occurrence” dates must reject future dates. New mark-weeding validation follows this, but create-bed `last_weeded_at` still only checks valid ISO date.
- **Fix**: Reuse past/today date validation for create-bed `last_weeded_at`, add client `max`, and ideally add a DB check constraint.
- **Decision**: FIXED — added server/client past-or-today validation and a database `garden_beds.last_weeded_at` not-future check constraint; full gate (`npx astro sync`, `npm run lint`, `npm run build`) passed.

### F4 — Weeding history endpoint is unbounded

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/garden/beds/[bedId]/weeding-events.ts:23
- **Detail**: History is append-only and currently returns all events for a bed.
- **Fix**: Add a default limit such as 50 events, with pagination later if needed.
- **Decision**: SKIPPED — accepted for MVP because history volume is expected to be small; revisit with pagination/load-more when usage warrants it.

### F5 — Locally prepended history can display out of order

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/garden/GardenQueue.tsx:761
- **Detail**: A backfilled older event is prepended locally, while the API sorts by `weeded_at desc, created_at desc`.
- **Fix**: Re-sort local events after insert, or reload history when already loaded.
- **Decision**: FIXED — local weeding history events are sorted by `weeded_at desc, created_at desc` after successful mark-weeding; full gate (`npx astro sync`, `npm run lint`, `npm run build`) passed.
