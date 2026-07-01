<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Redesign Front End Theme

- **Plan**: context/changes/redesign-front-end-theme/plan.md
- **Scope**: Phases 1-4 of 4
- **Date**: 2026-07-01
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Verification

- `npx astro sync` — PASS
- `npm run lint` — PASS
- `npm run test` — PASS, 29 tests passed
- `npm run build` — PASS
- `npm run test:e2e` — PASS, 2 tests passed

## Findings

### F1 — Auth error query text is rendered as trusted UI

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/auth/signin.astro:5, src/pages/auth/signup.astro:5
- **Detail**: The pages read `error` directly from the URL query and render it via `ServerError`. React escapes HTML, so this is not XSS, but arbitrary query text can appear as an official error message and may bypass the Polish UI rule.
- **Fix A ⭐ Recommended**: Use stable error codes in redirects and map them to approved Polish messages on the auth pages.
  - Strength: Prevents spoofed/non-Polish messages and keeps UI copy local.
  - Tradeoff: Requires touching auth API redirects and page mapping.
  - Confidence: HIGH — small boundary-hardening change.
  - Blind spot: Supabase-specific error detail would be hidden unless mapped.
- **Fix B**: Keep message redirects but reject unknown/free-form query values.
  - Strength: Smaller change if current API shape must stay.
  - Tradeoff: Still encourages message-in-URL flow.
  - Confidence: MED — safer than current, less clean than codes.
  - Blind spot: Needs a complete allowlist.
- **Decision**: FIXED via Fix A — stable URL error codes mapped to approved Polish messages

### F2 — “Today” date validation uses UTC date

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/garden/GardenQueue.tsx:2138
- **Detail**: `getTodayIsoDate()` uses `new Date().toISOString().slice(0, 10)`. That is UTC, so near local midnight a Polish user can have “today” treated as the previous/next UTC day.
- **Fix**: Build the `YYYY-MM-DD` string from local `getFullYear()`, `getMonth() + 1`, and `getDate()`.
- **Decision**: FIXED — replaced UTC today helper with local-date YYYY-MM-DD helper

### F3 — Auth background asset filename differs from plan

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: public/images/garden_login_background.webp
- **Detail**: Plan specified `public/images/garden-bed-auth-bg.webp`, but implementation added `public/images/garden_login_background.webp` and references it from `src/styles/global.css:127`. Functionally OK, but contract drift.
- **Fix**: Rename asset to the planned filename and update `bg-auth-garden`.
- **Decision**: DISMISSED — current asset name `garden_login_background.webp` is intentional; no code change

### F4 — Form DOM IDs include user-controlled bed names

- **Severity**: OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/components/garden/GardenQueue.tsx:1395, 1576, 1598+
- **Detail**: Nested form IDs use `bedName`. Duplicate names or unusual characters can create duplicate/fragile IDs and weaken label/input association.
- **Fix**: Pass `bed.id` into nested sections and build DOM IDs from the stable ID.
- **Decision**: FIXED — nested form DOM IDs now use stable `bed.id`; visible copy still uses `bed.name`

### F5 — English product name remains visible

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/Welcome.astro:15, src/pages/index.astro:9
- **Detail**: Repo lesson says user-facing UI should be Polish. `Garden Weed Planner` may be acceptable as a product name, but that exception is not documented.
- **Fix**: Either document it as a brand-name exception or translate visible copy.
- **Decision**: FIXED — translated visible product name and guest page title to Polish
