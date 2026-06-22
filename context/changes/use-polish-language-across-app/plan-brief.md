# Use Polish Language Across App — Plan Brief

> Full plan: `context/changes/use-polish-language-across-app/plan.md`

## What & Why

Translate the current Garden Weed Planner frontend to Polish so Polish-speaking users get a consistent product experience. The app currently mixes Polish and English across pages, forms, navigation, garden queue copy, validation messages, and fallback errors, which makes the product feel unfinished.

## Starting Point

Some weed catalog/domain labels are already Polish, but the main shell still contains starter/product copy in English. The largest remaining surfaces are `Welcome.astro`, auth pages/forms, `Topbar.astro`, `dashboard.astro`, `garden.astro`, `GardenQueue.tsx`, and validation messages in `src/lib/*.ts`.

## Desired End State

The current frontend routes and interactive states show Polish user-facing text throughout. “Garden bed” is consistently presented as “rabata”, visible technical errors become user-friendly Polish messages, and displayed dates use Polish locale formatting.

## Key Decisions Made

| Decision           | Choice                                             | Why                                                                            |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Translation scope  | Entire visible frontend plus visible errors        | Prevents mixed PL/EN states when validation or fallback messages reach the UI. |
| Landing page       | Rewrite as Polish Garden Weed Planner product copy | Removes starter copy and aligns `/` with the actual product.                   |
| Tone               | Natural, useful, direct Polish                     | Fits a practical garden-planning app without sounding too formal.              |
| “Garden bed” term  | “rabata”                                           | Natural for the product's garden-planning context and accepted by the user.    |
| Technical messages | User-friendly Polish                               | Users should not see raw Supabase/auth jargon when something fails.            |
| Date formatting    | Force `pl-PL` for visible dates                    | Keeps Polish copy and visible date formatting consistent.                      |
| Testing level      | Existing gates plus manual UI review               | Proportional to a copy/localization change without adding brittle grep tests.  |

## Scope

**In scope:**

- Landing page, navigation, auth pages, dashboard, garden page shell.
- Auth form labels, placeholders, validation, pending text, and accessibility labels.
- Garden queue UI, including rabata, plant, weed-observation, weeding-history, empty, loading, success, and error states.
- User-visible validation/domain messages in `src/lib/*.ts`.
- Visible date formatting in `GardenQueue.tsx`.

**Out of scope:**

- Full i18n framework or language switching.
- Route/path translation.
- Supabase schema, RLS, API contract, or database changes.
- Queue-priority/business-logic changes.
- New translation snapshot/grep tests.

## Architecture / Approach

Keep the current Astro/React component structure and perform an incremental copy/localization pass. Translate visible strings in place, preserve enum/API values and data contracts, and only change formatting where the UI renders user-facing dates.

## Phases at a Glance

| Phase                                                            | What it delivers                                                           | Key risk                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1. Static Pages and Navigation                                   | Polish landing, page shells, dashboard, garden intro, and topbar           | Accidentally leaving starter copy on `/`.                |
| 2. Auth Forms and Accessibility Text                             | Polish auth labels, validation, pending states, and password toggle labels | Missing hidden/accessibility text.                       |
| 3. Garden Queue UI                                               | Polish main garden queue and nested interactive sections                   | Large file with many fallback strings.                   |
| 4. Visible Domain Validation Messages and Polish Date Formatting | Polish helper/API validation messages and `pl-PL` visible dates            | Changing messages without changing validation semantics. |
| 5. Final Verification and Polish UI Review                       | Standard commands and manual route/state review                            | Manual review may miss rare error states.                |

**Prerequisites:** Existing change folder `context/changes/use-polish-language-across-app/`; Node/npm environment per `.nvmrc`.
**Estimated effort:** ~1–2 focused sessions across 5 small phases.

## Open Risks & Assumptions

- Some English strings may exist in rare browser/Supabase-generated errors outside app-owned copy; the plan targets app-owned visible strings and fallback messages.
- Manual testing depends on having enough local/authenticated state to exercise expanded garden sections.
- Technical identifiers, enum values, file names, routes, and imports can remain English because they are not user-facing interface text.

## Success Criteria (Summary)

- Main frontend routes and current interactive states show Polish copy consistently.
- Validation, fallback errors, accessibility labels, and visible dates match the Polish UI expectation.
- `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build` pass.
