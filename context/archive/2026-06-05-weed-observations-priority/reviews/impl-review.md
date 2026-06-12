<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Weed Observations Priority

- **Plan**: context/changes/weed-observations-priority/plan.md
- **Scope**: Phases 1–6 of 6
- **Date**: 2026-06-05
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 3 warnings 0 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Findings

### F1 — Nested observation route does not verify parent bed ownership

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/pages/api/garden/beds/[bedId]/weed-observations.ts:24
- **Detail**: The plan requires invalid/non-owned bed IDs to return not-found behavior. Current GET only filters observations by bed_id/user_id, so a non-owned or nonexistent bed returns 200 with an empty list. Current POST relies on DB/RLS failure and maps insert errors to 500, not 404.
- **Fix A ⭐ Recommended**: Add a DB-backed `verifyBedOwnership` check before GET/POST.
  - Strength: Matches the nested plants route behavior while respecting the lesson to avoid brittle custom ID-only validation.
  - Tradeoff: Adds one small parent-bed query per nested observation request.
  - Confidence: HIGH — identical ownership pattern exists in the plants route.
  - Blind spot: Could later be deduplicated into a shared helper.
- **Fix B**: Rely fully on RLS and change the documented/API expectation.
  - Strength: Keeps route code smaller and leans on database enforcement.
  - Tradeoff: GET cannot distinguish “empty own bed” from “not your bed”; POST error semantics remain less user-friendly unless mapped.
  - Confidence: MED — safe for isolation, weaker for the planned API contract.
  - Blind spot: Manual smoke tests may not catch confusing empty-list behavior.
- **Decision**: ACCEPTED — Fix B: RLS-first behavior accepted; API not-found semantics intentionally relaxed for this slice.

### F2 — Queue silently ignores observation query failures

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/garden/beds.ts:53
- **Detail**: If loading observations fails, the API returns a baseline queue instead of an error. Since observations now affect priority/date/order, users may see stale priority without knowing observation pressure was ignored.
- **Fix**: Return a 500 error such as “Unable to load weed observation priority data.”
- **Decision**: FIXED — Returned 500 when observation priority data cannot be loaded.

### F3 — Queue loads all observations before applying 60-day decay

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/garden/beds.ts:47
- **Detail**: The queue query loads all observations for listed beds, then the domain helper filters observations older than 60 days in memory. This is correct for MVP behavior but can grow unnecessarily as history accumulates.
- **Fix**: Add a DB-side `observed_at >= today - 60 days` filter to the queue summary query; keep full history in the per-bed observation endpoint.
- **Decision**: FIXED — Added DB-side 60-day observation window filter to the queue summary query.
