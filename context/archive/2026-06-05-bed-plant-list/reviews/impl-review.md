<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Bed Plant List Implementation Plan

- **Plan**: context/changes/bed-plant-list/plan.md
- **Scope**: Phases 1-5 of 5
- **Date**: 2026-06-05
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 3 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Verification

- `npx astro sync` — passed.
- `npm run lint` — passed.
- `npm run build` — passed.

## Findings

### F1 — Invalid bedId can return 500

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/garden/beds/[bedId]/plants.ts:116
- **Detail**: `bedId` is passed directly into a Supabase UUID comparison. A malformed URL param may produce a DB error and return `500`, although this is client input.
- **Fix A ⭐ Recommended**: Validate UUID before querying and return `404`.
  - Strength: Preserves current “missing or non-owned bed” semantics.
  - Tradeoff: Malformed IDs are hidden as not-found.
  - Confidence: HIGH — matches the route’s ownership-leak prevention goal.
  - Blind spot: None significant.
- **Fix B**: Validate UUID before querying and return `400`.
  - Strength: More explicit API input semantics.
  - Tradeoff: Slightly different error behavior from non-owned/missing beds.
  - Confidence: MED — depends on desired API style.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — validate UUID and return 404.

### F2 — Plant list endpoint is unbounded

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/garden/beds/[bedId]/plants.ts:36
- **Detail**: `GET` returns all plants for a bed. This is fine for MVP scale, but has no limit/pagination.
- **Fix**: Keep as-is for MVP, or add a conservative `.limit(...)` later.
- **Decision**: SKIPPED — acceptable for MVP scale.

### F3 — Plant input IDs use bedName

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/garden/GardenQueue.tsx:717
- **Detail**: IDs derived from `bedName` can duplicate when beds share names.
- **Fix**: Use `bed.id` or a `formIdPrefix` based on the UUID.
- **Decision**: SKIPPED — accepted as low-impact accessibility/HTML correctness issue.

### F4 — Time-dependent DB check is intentional but worth noting

- **Severity**: 👀 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260605130000_create_garden_bed_plants.sql:14
- **Detail**: `planted_year` uses `current_date` in a check constraint. This matches the product rule and app validation, but time-dependent DB constraints are harder to reason about long-term.
- **Fix A ⭐ Recommended**: Keep it as defense-in-depth.
  - Strength: DB enforces the same “no future planted year” rule.
  - Tradeoff: Constraint behavior changes as years pass.
  - Confidence: MED — acceptable here because the field semantics are explicit.
  - Blind spot: None significant.
- **Fix B**: Keep only static DB constraint `planted_year >= 1900`; enforce current-year max in app/API.
  - Strength: Simpler database invariant.
  - Tradeoff: Less protection if future clients bypass API validation.
  - Confidence: MED — depends on how much DB-level semantic enforcement this project wants.
  - Blind spot: Future direct DB write paths not checked.
- **Decision**: SKIPPED — consciously accepted time-dependent DB constraint as defense-in-depth.
