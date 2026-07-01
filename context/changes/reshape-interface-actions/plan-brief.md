# Reshape Interface Actions — Plan Brief

> Full plan: `context/changes/reshape-interface-actions/plan.md`

## What & Why

Reshape the garden queue so actions feel lighter and more contextual: add-bed moves to a modal, bed details move into tabs, bed-level create forms move into modals, delete becomes a compact X, and the unused Panel route disappears. The goal is a cleaner full-width queue where the main task — deciding what to weed next — stays visually central.

## Starting Point

`GardenQueue.tsx` currently contains a two-column layout: inline add-bed form on the left and “Następne rabaty do pielenia” on the right. Bed cards currently expose three action buttons, inline add forms for observations/weeding/plants, and a prominent inline delete block.

## Desired End State

The queue section is full width with “Dodaj rabatę” in its header and empty state. Bed cards use one active tab for observations, weeding history, or plants; each tab has a contextual modal for adding data. The Panel link/page is gone, while `/garden` remains the canonical protected garden route.

## Key Decisions Made

| Decision            | Choice                                                | Why                                                                                                       |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Modal approach      | Local accessible modal primitives                     | Avoids dependency churn while meeting this app’s immediate UI needs.                                      |
| Dashboard handling  | Remove `/dashboard` entirely                          | User explicitly said Panel and related views are no longer needed.                                        |
| Bed details         | One active tab per bed                                | Keeps cards compact and matches normal tab semantics.                                                     |
| Delete confirmation | X trigger with inline confirmation                    | Makes delete less prominent while preserving the existing safe card-scoped flow.                          |
| Submit success      | Close modal and show page/card feedback               | Keeps the UI clean and confirms the result where the user returns.                                        |
| Bed-level actions   | Actions inside relevant tab panels                    | Keeps actions contextual and avoids crowded card headers.                                                 |
| E2E scope           | Update existing tests plus one mark-weeded smoke path | Covers moved add/delete controls and the riskiest bed-level modal lifecycle without broad modal coverage. |
| Empty queue CTA     | Add “Dodaj rabatę” in empty state                     | Improves first-use flow even though the header has the same action.                                       |

## Scope

**In scope:**

- Full-width queue layout.
- Add-bed modal from queue header and empty state.
- One-active-tab bed card details.
- Modals for add observation, mark weeded, and add plant.
- Delete X with inline confirmation.
- Green “Oznacz rabatę jako wypieloną” action.
- Remove Panel nav, route, and protected-route entry.
- Update existing E2E tests for moved controls.
- Add one minimal E2E smoke path for the mark-weeded modal lifecycle.

**Out of scope:**

- Backend/API/domain changes.
- Supabase schema/RLS changes.
- New Radix/shadcn dialog or tabs dependencies.
- New E2E coverage for every bed-level modal.
- Redirecting `/dashboard` to `/garden`.

## Architecture / Approach

Keep the work centered in `src/components/garden/GardenQueue.tsx`: reuse existing state, validators, payload builders, and fetch handlers, but change where forms and actions render. Add small local modal/tab primitives, preserve lazy loading for bed details, update navigation/middleware for Panel removal, and adjust Playwright tests around the new interaction path.

## Phases at a Glance

| Phase                                   | What it delivers                                               | Key risk                                                        |
| --------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| 1. Modal primitive and full-width queue | Local modal foundation plus add-bed modal and full-width queue | Modal validation/success state sequencing                       |
| 2. Bed card tabs and action modals      | Delete X, one-active tabs, bed-level creation modals           | Large `GardenQueue.tsx` refactor may break existing state flows |
| 3. Remove Panel route/navigation        | No Panel link/page/protected-route entry                       | Accidentally affecting `/garden` auth protection                |
| 4. E2E and verification                 | Updated existing browser tests and full gate                   | Playwright locators may need careful accessible names           |

**Prerequisites:** Existing local auth/E2E setup should work for `/garden` tests.  
**Estimated effort:** ~2-3 implementation sessions across 4 phases.

## Open Risks & Assumptions

- Local modal accessibility must be implemented carefully because the repo has no existing dialog primitive.
- `/dashboard` removal intentionally produces no redirect; bookmarks may 404.
- Existing E2E tests cover add/delete and priority ordering; the plan adds one mark-weeded modal smoke path but still does not cover every new modal path.

## Success Criteria (Summary)

- Users can add beds and bed-level records through modals without losing validation/error feedback.
- Bed cards are cleaner: compact delete X, one active detail tab, contextual add actions.
- `/garden` remains the working protected garden route, and Panel disappears from navigation and route surface.
