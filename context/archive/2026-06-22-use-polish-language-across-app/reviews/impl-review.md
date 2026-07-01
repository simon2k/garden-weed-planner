<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Use Polish Language Across App

- **Plan**: context/changes/use-polish-language-across-app/plan.md
- **Scope**: Phases 1-5 of 5
- **Date**: 2026-07-01
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 0 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Automated Verification

- `npx astro sync` — PASS
- `npm run lint` — PASS
- `npm run test` — PASS, 29 tests passed
- `npm run build` — PASS

## Findings

### F1 — Visible English remains in weed catalog

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/weed-observations.ts:258-262
- **Detail**: The weed catalog still contains visible English copy: `nutsedge` and `Fallback`. `GardenQueue.tsx` renders these values in the UI, so Polish-only UI is not fully achieved.
- **Fix**: Translate the catalog name/helper text while preserving slug and enum values.
- **Decision**: FIXED — translated visible weed catalog English copy while preserving slug and enum values.

### F2 — API/auth error messages can still surface in English

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/pages/api/auth/signin.ts:11, src/pages/api/garden/beds.ts:23, and related API route fallback errors
- **Detail**: Several API routes still return English errors such as “Authentication required”, “Unable to create garden bed”, and “Supabase is not configured”. GardenQueue and auth pages render server errors, so these can reach users.
- **Fix ⭐ Recommended**: Translate API fallback errors that are rendered by frontend flows.
  - Strength: Completes the Polish UI contract, including failure states.
  - Tradeoff: Touches multiple API files, but only string literals.
  - Confidence: HIGH — no behavior or payload shape needs to change.
  - Blind spot: Raw Supabase `error.message` may still be English unless mapped separately.
- **Decision**: FIXED — applied recommended fix by translating rendered API/auth fallback error strings while preserving response shape and status codes.

### F3 — Polish date formatting can shift date by timezone

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/garden/GardenQueue.tsx:2133
- **Detail**: `formatDisplayDate()` uses `new Date(`${value}T00:00:00Z`)` with `Intl.DateTimeFormat("pl-PL")`, but no `timeZone`. In negative timezones, a stored `YYYY-MM-DD` date can display as the previous day.
- **Fix**: Add `timeZone: "UTC"` to the `Intl.DateTimeFormat("pl-PL", ...)` options.
- **Decision**: FIXED — added UTC timezone to Polish date formatter to avoid previous-day rendering in negative timezones.
