# Reshape Interface Actions Implementation Plan

## Overview

Reshape the garden queue interface so creation and per-bed actions no longer dominate the page. The add-bed form moves into a modal opened from the queue header, bed detail actions become one-active-tab panels, bed-level create forms move into modals, delete becomes a compact top-right X with inline confirmation, and the obsolete Panel navigation/route is removed.

## Current State Analysis

The garden experience is rendered through `GardenPage.astro`, which mounts the stateful `GardenQueue` React island client-only. `GardenQueue` currently combines all queue layout, add-bed form state, bed card actions, expandable detail sections, inline creation forms, delete confirmation, validation, and API calls in one large component.

The page shell is already wide (`max-w-[96rem]`), but `GardenQueue` uses a two-column layout: the inline add-bed form sits in the left column and the queue card sits in the right column. Per-bed details are currently managed by three independent expanded-state sets, which allows plants, observations, and weeding history to be open simultaneously. There are no existing modal or tabs primitives in `src/components/ui`; only the shadcn-style `Button` component exists, and `package.json` has Radix Slot but no Radix Dialog/Tabs dependency.

The existing API surface already supports the desired actions: add/delete beds, add/list plants, add/list weed observations, list weeding history, and mark a bed as weeded. This change is therefore UI/state/test restructuring only, not a backend or data-model change.

## Desired End State

The queue area is full width and has a top-right “Dodaj rabatę” action. Clicking it opens a local accessible modal containing the existing add-bed form; successful submit closes the modal and shows the success message in the queue context. Empty queue state also offers the same add-bed modal CTA.

Each bed card has a compact delete X in its top-right corner. Clicking it reveals the existing card-scoped inline confirmation instead of opening a destructive modal. The three bed detail actions become one-active-tab panels: observations, weeding history, and plants. Each panel displays existing loaded content and has its own contextual “Dodaj…” action that opens a modal for new observations, completed weeding, or plants. Successful modal submits close the modal, refresh/update the existing state as today, and show success feedback in the visible card/page context. “Oznacz rabatę jako wypieloną” uses green styling.

The main navigation no longer includes “Panel”, `/dashboard` is removed, and `/dashboard` is removed from `PROTECTED_ROUTES`. Existing E2E tests continue covering add/delete bed and priority ordering, updated only for the moved controls.

### Key Discoveries:

- `src/components/garden/GardenQueue.tsx:827-1033` contains the current two-column layout, inline add-bed form, and queue section.
- `src/components/garden/GardenQueue.tsx:1148-1375` contains each bed card, current action buttons, delete confirmation, and conditional detail sections.
- `src/components/garden/GardenQueue.tsx:1377-1851` contains inline forms/sections for weeding, observations, and plants that need to be split into visible tab content plus modal forms.
- `src/components/Topbar.astro:13-18` contains the “Panel” navigation link.
- `src/pages/dashboard.astro` is the obsolete Panel page to remove.
- `src/middleware.ts:4` includes `/dashboard` in `PROTECTED_ROUTES`; this must be updated if the route is deleted.
- `e2e/seed.spec.ts:13-31` and `e2e/priority-queue.spec.ts:29-85` assume inline add-bed fields and a visible “Usuń rabatę” button, so they must be updated.
- `context/foundation/lessons.md` requires all user-facing UI text, including aria labels and modal/tab labels, to remain Polish.

## What We're NOT Doing

- Not changing Supabase schema, RLS policies, API route contracts, or garden priority/domain logic.
- Not adding Radix Dialog/Tabs or other new UI dependencies for this change.
- Not creating a broad reusable design system beyond the local modal/tab primitives needed here.
- Not adding new E2E scenarios for observation, plant, or weeding modals in this change; existing E2E scenarios are updated for moved controls only.
- Not preserving `/dashboard` as a redirect; the route is removed entirely.
- Not changing `/garden` or authenticated `/` as the canonical garden experience.
- Not changing Polish copy to English.

## Implementation Approach

Keep the implementation contained primarily in `GardenQueue.tsx`. Introduce small local accessible modal and tabs primitives/helper components inside the garden component file unless extraction becomes necessary for readability. Reuse existing state, validation, payload conversion, API calls, success/error messages, and list update behavior; only change where forms/actions render and how users open them.

Use one active detail tab per bed card instead of three independent visual sections. Preserve lazy loading: selecting a tab loads that tab’s data if it has not loaded yet. Keep delete confirmation inline and card-scoped to preserve the existing safe destructive flow while moving the trigger to a compact top-right X.

## Critical Implementation Details

### User experience spec

The local modal must be accessible enough for this app: render a labeled dialog overlay with `role="dialog"` and `aria-modal="true"`, move focus into the dialog on open, prevent keyboard focus from escaping into the page behind the dialog, restore focus to the opener on close, include a visible Polish close action, close on Escape/backdrop where safe, restore a clean page state after submit, and avoid losing validation errors while the user is correcting a modal form. Tabs should use Polish visible labels and aria state so Playwright and keyboard users can target them semantically.

### State sequencing

For add-bed, observation, weeding, and plant modal submissions, close the modal only after the existing successful state update completes. Validation failure and API failure must keep the relevant modal open so the user can correct the form.

## Phase 1: Modal Primitive and Full-Width Queue Layout

### Overview

Create the local modal foundation, move the add-bed form into a modal, and make the queue section full width with a header and empty-state CTA.

### Changes Required:

#### 1. Local modal primitive

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Provide a small local modal pattern for the garden island without adding dependencies.

**Contract**: Add a reusable local modal component/helper in the same file, with Polish accessible labels supplied by callers, `role="dialog"`, `aria-modal="true"`, focus moved into the dialog on open, keyboard focus contained while open, focus restored to the opener on close, visible close control, overlay, Escape/backdrop closing behavior where safe, and styling consistent with the existing garden cards. It must not introduce SSR assumptions because `GardenQueue` is already a client-only React island.

#### 2. Add-bed modal state and submit lifecycle

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Move the existing add-bed form out of the page column and into a modal opened from the queue header and empty state.

**Contract**: Add state for whether the add-bed modal is open. Preserve existing `form`, `fieldErrors`, `isSubmitting`, `error`, `successMessage`, `validateForm`, `toCreatePayload`, and `handleSubmit` behavior. On validation or API error, keep the modal open. On successful create, reload/update beds as today, reset the form, close the modal, and show the existing success message in the queue/page context.

#### 3. Full-width queue section

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Remove the left-column form layout so “Następne rabaty do pielenia” owns the full width.

**Contract**: Replace the current two-column section layout with a single full-width queue card. The queue header keeps “Kolejka priorytetów”, “Następne rabaty do pielenia”, summary text, and “Odśwież”, and adds a top-right “Dodaj rabatę” button. Empty state includes an additional “Dodaj rabatę” CTA opening the same modal.

### Success Criteria:

#### Automated Verification:

- Astro sync passes: `npx astro sync`
- Lint passes: `npm run lint`
- Unit tests pass: `npm run test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/garden` shows “Następne rabaty do pielenia” as a full-width queue section.
- “Dodaj rabatę” in the queue header opens a modal with the existing add-bed fields.
- Empty queue state also offers “Dodaj rabatę” and opens the same modal.
- Validation errors keep the add-bed modal open.
- Successful add closes the modal, adds the bed to the queue, and shows Polish success feedback.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Bed Card Tabs, Action Modals, and Delete X

### Overview

Reshape per-bed card actions: compact delete X with inline confirmation, one-active-tab detail panels, and modal-based creation for observations, weeding, and plants.

### Changes Required:

#### 1. One-active-tab state per bed

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Replace the three independent expanded action buttons with a tab model so each card shows only one detail panel at a time.

**Contract**: Track one active tab per bed, with tab values for observations, weeding history, and plants. Selecting a tab should lazy-load that tab’s data if it has not loaded yet, preserving the current load functions and error retry behavior. Removing a bed must clear its active tab state, any bed-level modal-open state for observation/weeding/plant actions, and the existing per-bed state cleanup.

#### 2. Tabbed bed card UI

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Move “pokaż obserwacje chwastów”, “historia pielenia”, and “pokaż rośliny” into card tabs.

**Contract**: Replace the current action-button row with Polish tab controls. Each tab panel renders the existing read/list content for that area. Observations tab shows observation list and retry/error states; history tab shows weeding event list and retry/error states; plants tab shows plant list and retry/error states. The tab UI must preserve list/card semantics enough that priority E2E assertions on `listitem` and bed headings still work.

#### 3. Delete X with inline confirmation

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Make delete less visually dominant while keeping the existing safe confirmation behavior.

**Contract**: Move the delete trigger to the top-right corner of the bed card as a compact X/icon button with a Polish accessible name such as “Usuń rabatę”. Clicking it shows the current inline confirmation copy/actions inside the same card. Keep `confirmingDeleteBedId`, `deletingBedId`, `deleteBed`, and `removeDeletedBedState` behavior intact.

#### 4. Observation creation modal

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Move adding a new weed observation out of the observations panel into a contextual modal.

**Contract**: Observations tab panel has a “Dodaj obserwację” action that opens a modal containing the existing observation form fields. Preserve catalog selection, trait defaults, validation, payload conversion, submit behavior, queue refresh after success, and Polish errors/success messages. Validation/API errors keep the modal open; success closes it and shows feedback in the card/tab context.

#### 5. Weeding completion modal and green action

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Move “wykonanie pielenia” into a modal and change “Oznacz rabatę jako wypieloną” from blue to green.

**Contract**: Weeding/history tab panel has a green “Oznacz rabatę jako wypieloną” action that opens a modal containing the existing weeding form fields. Preserve date max validation, duration/note validation, `PATCH /mark-weeded`, queue refresh after success, event insertion/sorting behavior, and Polish feedback. Validation/API errors keep the modal open; success closes it and shows feedback in the card/tab context.

#### 6. Plant creation modal

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Move adding new plants out of the plants panel into a contextual modal.

**Contract**: Plants tab panel has a “Dodaj roślinę” action that opens a modal containing the existing plant form fields. Preserve validation, payload conversion, list insertion behavior, and Polish error handling. Validation/API errors keep the modal open; success closes it and leaves the new plant visible in the plants tab.

### Success Criteria:

#### Automated Verification:

- Astro sync passes after bed-card changes: `npx astro sync`
- Lint passes after bed-card changes: `npm run lint`
- Unit tests pass after bed-card changes: `npm run test`
- Production build passes after bed-card changes: `npm run build`

#### Manual Verification:

- Each bed card has a top-right X/icon button with Polish accessible delete label.
- Delete X opens inline confirmation in the same card; cancel and confirm still work.
- Only one of observations, weeding history, or plants is visible per bed card at a time.
- Selecting each tab lazy-loads its data and preserves retry/error behavior.
- Add observation, mark weeded, and add plant actions open modals and close only after successful submit.
- Failed validation/API calls keep the relevant modal open with Polish errors.
- “Oznacz rabatę jako wypieloną” is green.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Remove Panel Navigation and Route

### Overview

Remove the obsolete Panel concept from navigation and routing.

### Changes Required:

#### 1. Topbar navigation

**File**: `src/components/Topbar.astro`

**Intent**: Remove the “Panel” link from the authenticated main navigation.

**Contract**: Delete the `/dashboard` anchor and visible “Panel” text. Preserve `Ogród`, `Wyloguj`, unauthenticated `Zaloguj`, and `Utwórz konto` behavior and Polish copy.

#### 2. Dashboard route removal

**File**: `src/pages/dashboard.astro`

**Intent**: Remove the unused Panel page entirely.

**Contract**: Delete the dashboard page file. Do not replace it with a redirect for this change.

#### 3. Protected route list

**File**: `src/middleware.ts`

**Intent**: Keep middleware route protection aligned with existing routes.

**Contract**: Remove `/dashboard` from `PROTECTED_ROUTES`; keep `/garden` protected. Do not change Supabase auth lookup or redirect behavior.

### Success Criteria:

#### Automated Verification:

- Astro sync passes after route removal: `npx astro sync`
- Lint passes after route removal: `npm run lint`
- Unit tests pass after route removal: `npm run test`
- Production build passes after route removal: `npm run build`

#### Manual Verification:

- Authenticated topbar no longer shows “Panel”.
- Authenticated topbar still shows “Ogród” and “Wyloguj”.
- `/garden` remains protected and renders for authenticated users.
- `/dashboard` no longer renders the old Panel page.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: E2E Updates and Final Verification

### Overview

Update existing browser tests to follow the reshaped UI and run the full handoff gate.

### Changes Required:

#### 1. Seed E2E test

**File**: `e2e/seed.spec.ts`

**Intent**: Keep the existing add/delete bed sync scenario while adapting it to the modal add flow and delete X flow.

**Contract**: Update the test to open the add-bed modal before filling “Nazwa rabaty” and “Poziom zachwaszczenia”. Update delete interaction to use the compact delete control while preserving the inline confirmation assertions and final hidden-bed assertion.

#### 2. Priority queue E2E test

**File**: `e2e/priority-queue.spec.ts`

**Intent**: Keep the existing priority-ordering scenario while adapting setup and cleanup to the moved controls.

**Contract**: Update stale cleanup and final cleanup to use the delete X flow. Update bed creation steps to open the add-bed modal for each bed, fill the same fields, submit, and assert the same success messages and priority ordering outcomes.

#### 3. Bed-level modal E2E smoke test

**File**: `e2e/priority-queue.spec.ts` or a new focused spec under `e2e/`

**Intent**: Cover one high-risk bed-level modal lifecycle with browser automation.

**Contract**: Add one minimal mark-weeded smoke path that opens a bed's weeding/history tab, opens the green “Oznacz rabatę jako wypieloną” modal, submits a valid pielenie entry, asserts the modal closes after success, and verifies the visible card/history state reflects the saved entry. Keep the test narrow; do not expand this change into full E2E coverage for every observation/plant/weeding modal.

#### 4. Final repository verification

**Files**: Repository-wide verification

**Intent**: Confirm the UI restructure, route removal, tests, and build all pass together.

**Contract**: Run the repository-required commands and record pass/fail in Progress during implementation. Include E2E because existing tests depend on the moved controls and the new mark-weeded modal smoke path.

### Success Criteria:

#### Automated Verification:

- Astro sync passes after final changes: `npx astro sync`
- Lint passes after final changes: `npm run lint`
- Unit tests pass after final changes: `npm run test`
- E2E tests pass after test updates, including the mark-weeded modal smoke path: `npm run test:e2e`
- Production build passes after final changes: `npm run build`

#### Manual Verification:

- `/garden` add/delete bed happy path works through the new modal/X UI.
- Priority queue ordering remains correct after adding multiple beds through the modal.
- Bed tabs and bed-level action modals remain visually coherent on desktop and mobile widths.
- No “Panel” link or old Panel page remains visible in normal navigation.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for final manual acceptance before handoff.

---

## Testing Strategy

### Unit Tests:

- Run existing Vitest suite with `npm run test`; no new domain unit tests are expected because API/domain logic is unchanged.
- Rely on TypeScript/ESLint to catch prop/state refactor mistakes inside `GardenQueue.tsx`.

### Integration Tests:

- Update `e2e/seed.spec.ts` for add-bed modal and delete X flow.
- Update `e2e/priority-queue.spec.ts` for repeated add-bed modal setup and delete X cleanup.
- Add one minimal E2E smoke path for the mark-weeded modal lifecycle: open from the weeding/history tab, submit valid data, assert modal close, and verify visible saved state.
- Run `npm run test:e2e` to verify browser-level garden behavior still works.

### Manual Testing Steps:

1. Start the dev server with `npm run dev`.
2. Visit `/garden` as an authenticated user.
3. Confirm the queue section is full width and has “Dodaj rabatę” in the header.
4. Open add-bed modal, submit invalid input, and confirm Polish validation stays visible in the modal.
5. Add a valid bed and confirm the modal closes and the bed appears in the queue.
6. Use the bed-card X delete control, cancel once, then confirm delete and verify the bed disappears.
7. Open each bed tab: observations, history, plants; confirm only one panel is visible at a time.
8. Open add observation, mark weeded, and add plant modals; verify validation failure keeps each modal open.
9. Submit valid observation/weeding/plant entries and verify modals close and visible card data updates.
10. Confirm “Oznacz rabatę jako wypieloną” is green.
11. Confirm authenticated topbar no longer shows “Panel” and `/dashboard` no longer renders the old page.
12. Check the main garden UI at a narrow/mobile viewport for modal usability and non-crowded card headers.

## Performance Considerations

This change should not increase API calls except when users actively select a tab or submit a modal. Preserve lazy loading for observations, weeding history, and plants so rendering the queue does not fetch all detail data for every bed. Modal components should be local and lightweight; avoid adding dependencies or global providers.

## Migration Notes

No database, API, data, or secret migration is required. Removing `/dashboard` may break bookmarks to that route by design; `/garden` and authenticated `/` remain the supported garden entry points.

## References

- Change identity: `context/changes/reshape-interface-actions/change.md`
- Main garden island: `src/components/garden/GardenQueue.tsx`
- Garden shell: `src/components/garden/GardenPage.astro`
- Navigation: `src/components/Topbar.astro`
- Protected routes: `src/middleware.ts`
- Obsolete Panel route: `src/pages/dashboard.astro`
- E2E seed test: `e2e/seed.spec.ts`
- E2E priority test: `e2e/priority-queue.spec.ts`
- Polish UI rule: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Modal Primitive and Full-Width Queue Layout

#### Automated

- [x] 1.1 Astro sync passes: `npx astro sync` — 49cea8a
- [x] 1.2 Lint passes: `npm run lint` — 49cea8a
- [x] 1.3 Unit tests pass: `npm run test` — 49cea8a
- [x] 1.4 Production build passes: `npm run build` — 49cea8a

#### Manual

- [x] 1.5 `/garden` shows “Następne rabaty do pielenia” as a full-width queue section — 49cea8a
- [x] 1.6 “Dodaj rabatę” in the queue header opens a modal with the existing add-bed fields — 49cea8a
- [x] 1.7 Empty queue state also offers “Dodaj rabatę” and opens the same modal — 49cea8a
- [x] 1.8 Validation errors keep the add-bed modal open — 49cea8a
- [x] 1.9 Successful add closes the modal, adds the bed to the queue, and shows Polish success feedback — 49cea8a

### Phase 2: Bed Card Tabs, Action Modals, and Delete X

#### Automated

- [x] 2.1 Astro sync passes after bed-card changes: `npx astro sync`
- [x] 2.2 Lint passes after bed-card changes: `npm run lint`
- [x] 2.3 Unit tests pass after bed-card changes: `npm run test`
- [x] 2.4 Production build passes after bed-card changes: `npm run build`

#### Manual

- [x] 2.5 Each bed card has a top-right X/icon button with Polish accessible delete label
- [x] 2.6 Delete X opens inline confirmation in the same card; cancel and confirm still work
- [x] 2.7 Only one of observations, weeding history, or plants is visible per bed card at a time
- [x] 2.8 Selecting each tab lazy-loads its data and preserves retry/error behavior
- [x] 2.9 Add observation, mark weeded, and add plant actions open modals and close only after successful submit
- [x] 2.10 Failed validation/API calls keep the relevant modal open with Polish errors
- [x] 2.11 “Oznacz rabatę jako wypieloną” is green

### Phase 3: Remove Panel Navigation and Route

#### Automated

- [ ] 3.1 Astro sync passes after route removal: `npx astro sync`
- [ ] 3.2 Lint passes after route removal: `npm run lint`
- [ ] 3.3 Unit tests pass after route removal: `npm run test`
- [ ] 3.4 Production build passes after route removal: `npm run build`

#### Manual

- [ ] 3.5 Authenticated topbar no longer shows “Panel”
- [ ] 3.6 Authenticated topbar still shows “Ogród” and “Wyloguj”
- [ ] 3.7 `/garden` remains protected and renders for authenticated users
- [ ] 3.8 `/dashboard` no longer renders the old Panel page

### Phase 4: E2E Updates and Final Verification

#### Automated

- [ ] 4.1 Astro sync passes after final changes: `npx astro sync`
- [ ] 4.2 Lint passes after final changes: `npm run lint`
- [ ] 4.3 Unit tests pass after final changes: `npm run test`
- [ ] 4.4 E2E tests pass after test updates, including the mark-weeded modal smoke path: `npm run test:e2e`
- [ ] 4.5 Production build passes after final changes: `npm run build`

#### Manual

- [ ] 4.6 `/garden` add/delete bed happy path works through the new modal/X UI
- [ ] 4.7 Priority queue ordering remains correct after adding multiple beds through the modal
- [ ] 4.8 Bed tabs and bed-level action modals remain visually coherent on desktop and mobile widths
- [ ] 4.9 No “Panel” link or old Panel page remains visible in normal navigation
