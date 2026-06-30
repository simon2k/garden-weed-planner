# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Validate date direction semantics

- **Context**: Date validation in API/domain helpers and matching UI inputs
- **Problem**: Future/past dates can be accepted even when they contradict field semantics, causing misleading calculations or state.
- **Rule**: Always decide whether past, today, and future dates are valid for each accepted date field. For “last occurrence” fields like last_weeded_at, accept only past dates including today.
- **Applies to**: plan

## Prefer database-backed ownership over brittle route ID validators

- **Context**: Nested API routes for child resources, especially `src/pages/api/**/[id]/*.ts` routes that receive parent IDs from the URL and then insert/list rows through Supabase.
- **Problem**: A local UUID/route-param guard rejected a valid bed ID before the request reached Supabase, causing false `400/404` errors in the UI. Debugging was harder because the route-level check masked whether the real issue was URL extraction, ownership, RLS, or insert constraints.
- **Rule**: Avoid brittle custom ID validators in nested routes when Supabase foreign keys and RLS already enforce existence and ownership. Validate that the route parameter is present, then let database constraints/RLS decide whether the operation is allowed; surface/log real Supabase errors during implementation.
- **Applies to**: plan, implement, impl-review

## Always use Polish language in the interface

- **Context**: User-facing frontend interface, including pages, components, forms, validation messages, empty states, success/error messages, aria labels, and visible date/formatting choices.
- **Problem**: Mixed Polish/English UI makes the product feel unfinished and can confuse Polish-speaking users, especially when errors or fallback messages surface from helpers or API responses.
- **Rule**: Always use Polish for user-facing interface text. When adding or changing UI, translate visible copy, validation messages, fallback errors, accessibility labels, and locale-sensitive formatting consistently.
- **Applies to**: plan, plan-review, implement, impl-review
