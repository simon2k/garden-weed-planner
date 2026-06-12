<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Introduce Development Gates

- **Plan**: `context/changes/introduce-development-gates/plan.md`
- **Scope**: Phases 1-3 of 3
- **Date**: 2026-06-12
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 0 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Findings

### F1 — Staged related-test script mishandles unusual file names

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality / Pattern Consistency
- **Location**: `package.json:15`
- **Detail**: `test:related:staged` collected staged files into a shell variable and invoked `npx vitest related $FILES --run` with `$FILES` unquoted. Paths with spaces, tabs, newlines, or shell glob characters could be split or expanded incorrectly, causing Vitest to receive the wrong arguments or fail.
- **Fix A ⭐ Recommended**: Move the logic to a small Node script that calls Vitest with an argv array.
  - Strength: Avoids shell word-splitting entirely and keeps `package.json` readable.
  - Tradeoff: Adds one small script file.
  - Confidence: HIGH — argv arrays are the standard safe pattern for this case.
  - Blind spot: Need to verify the script works under Husky/lint-staged context.
- **Fix B**: Keep shell, but switch to null-delimited Git output plus array-safe handling.
  - Strength: Smaller file footprint; keeps behavior inline.
  - Tradeoff: Shell portability and quoting remain easier to get wrong.
  - Confidence: MED — safe if carefully written, but less maintainable.
  - Blind spot: Need to test under `/bin/sh`, not only interactive zsh.
- **Decision**: FIXED via Fix A. Added `scripts/test-related-staged.mjs`, changed `package.json` to call it, and verified `npm run test:related:staged` plus `npm run lint`.

## Verification

Passed during review:

- `npm run test:related:staged`
- `npm run test:pre-push`
- `npm run lint`
- `npm run test`
- `npx astro sync`
- `npm run build`
