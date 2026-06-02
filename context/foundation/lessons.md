# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Validate date direction semantics

- **Context**: Date validation in API/domain helpers and matching UI inputs
- **Problem**: Future/past dates can be accepted even when they contradict field semantics, causing misleading calculations or state.
- **Rule**: Always decide whether past, today, and future dates are valid for each accepted date field. For “last occurrence” fields like last_weeded_at, accept only past dates including today.
- **Applies to**: plan
