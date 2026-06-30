# Use Polish Language Across App Implementation Plan

## Overview

Translate the current Garden Weed Planner frontend to Polish so the visible product experience is consistent for Polish-speaking users. The change covers pages, navigation, auth forms, the garden queue interface, user-visible validation/fallback errors, accessibility labels, and visible date formatting; it does not change routes, data shape, Supabase configuration, or queue-priority business logic.

## Current State Analysis

The app currently mixes Polish and English. Some weed-observation domain labels are already Polish, but the starter landing page, auth flow, dashboard, navigation, most garden queue copy, validation messages, fallback errors, and date formatting still use English or browser-default locale.

## Desired End State

A user can browse the existing frontend flows and see Polish interface text throughout: landing, sign-in/sign-up, confirmation, dashboard, garden queue, forms, empty states, success/error messages, and accessibility labels. Visible dates in the UI use Polish locale formatting. The implementation remains a copy/localization change, preserving existing behavior and passing the repository's standard verification gate.

### Key Discoveries:

- `src/components/Welcome.astro` still contains starter-product copy such as “10x Astro Starter” and technology cards; it should become a Polish product landing page.
- `src/components/Topbar.astro`, `src/pages/auth/*.astro`, `src/pages/dashboard.astro`, and `src/pages/garden.astro` contain visible English navigation, page titles, headings, and helper copy.
- `src/components/auth/SignInForm.tsx`, `src/components/auth/SignUpForm.tsx`, and `src/components/auth/PasswordToggle.tsx` contain English labels, placeholders, validation messages, pending states, and `aria-label` text.
- `src/components/garden/GardenQueue.tsx` is the largest UI surface and contains English labels, headings, status messages, form validation, fallback errors, empty states, and `Intl.DateTimeFormat(undefined, ...)` for visible dates.
- `src/lib/garden-beds.ts`, `src/lib/bed-plants.ts`, `src/lib/weeding-events.ts`, and `src/lib/weed-observations.ts` return validation messages that can surface through API/UI error handling and therefore must be user-friendly Polish messages.
- `context/foundation/lessons.md` now includes the recurring rule “Always use Polish language in the interface”; this plan applies it directly.

## What We're NOT Doing

- Not adding a multi-language/i18n framework.
- Not introducing translation dictionaries unless the implementer finds a tiny local constant useful inside an existing component.
- Not changing URL paths such as `/auth/signin`, `/auth/signup`, `/dashboard`, or `/garden`.
- Not changing Supabase schema, RLS policies, API contracts, or database data.
- Not changing queue scoring, priority calculation, validation semantics, or protected-route behavior.
- Not adding a grep/snapshot test for English strings in this change.

## Implementation Approach

Use a direct, incremental translation pass over existing UI surfaces. Keep the current component boundaries and replace visible English copy with natural, user-facing Polish. Prefer “rabata” for “garden bed”, use a natural and direct tone, translate technical errors into user-friendly messages, and force visible date formatting to `pl-PL` where dates are rendered for users.

## Critical Implementation Details

### User experience spec

Use “rabata” consistently for garden beds and avoid mixing “grządka” or “garden bed” in visible UI. Translate technical messages into user-facing Polish rather than literal developer wording, for example “Zaloguj się, aby kontynuować” instead of “Wymagane uwierzytelnienie”.

### Locale formatting

`GardenQueue.tsx` currently formats visible dates with `Intl.DateTimeFormat(undefined, { dateStyle: "medium" })`; replace the undefined locale with `"pl-PL"` for consistent Polish UI output.

## Phase 1: Static Pages and Navigation

### Overview

Translate the Astro page shells, navigation, dashboard, garden intro, confirmation page, and landing page. Replace starter copy in the landing page with Garden Weed Planner product copy in Polish.

### Changes Required:

#### 1. Landing page product copy

**File**: `src/components/Welcome.astro`

**Intent**: Replace starter-oriented English copy with Polish Garden Weed Planner copy. The landing page should describe the app as a tool for planning weeding priorities and guide users to sign in or create an account.

**Contract**: Update visible headings, paragraphs, CTA labels, and feature-card headings/descriptions. Keep existing layout, links, visual structure, and routes unless a card becomes unnecessary copy-wise.

#### 2. Top navigation

**File**: `src/components/Topbar.astro`

**Intent**: Translate navigation labels and signed-in/signed-out state text to Polish.

**Contract**: Keep existing links and sign-out form action. Use Polish labels such as “Panel”, “Ogród”, “Wyloguj”, “Zaloguj”, “Utwórz konto”, and “Niezalogowany” or a more natural equivalent.

#### 3. Auth and confirmation page shells

**Files**: `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`

**Intent**: Translate page titles, headings, helper links, and confirmation content.

**Contract**: Keep the existing imported React forms and routes. Translate `Layout title`, headings, the sign-in/sign-up cross-links, and both confirmation states.

#### 4. Dashboard and garden shell copy

**Files**: `src/pages/dashboard.astro`, `src/pages/garden.astro`

**Intent**: Translate dashboard and garden intro copy while preserving authenticated-user display and the `GardenQueue` island.

**Contract**: Keep route structure and component usage unchanged. Translate visible titles, headings, welcome text, and explanatory copy. Use “rabata” and “pielenie” consistently.

### Success Criteria:

#### Automated Verification:

- Astro sync passes: `npx astro sync`
- Lint passes for changed files: `npm run lint`

#### Manual Verification:

- Landing page, top navigation, dashboard, auth pages, and garden page shell show Polish copy with no obvious English starter text.
- Existing links still navigate to the same routes.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Auth Forms and Accessibility Text

### Overview

Translate the React auth forms, including labels, placeholders, validation messages, pending button text, and password visibility accessibility labels.

### Changes Required:

#### 1. Sign-in form copy and validation

**File**: `src/components/auth/SignInForm.tsx`

**Intent**: Translate sign-in labels, placeholders, validation errors, and submit states to Polish.

**Contract**: Keep form `method`, `action`, field names, validation logic, and component composition unchanged. Translate user-facing strings only.

#### 2. Sign-up form copy and validation

**File**: `src/components/auth/SignUpForm.tsx`

**Intent**: Translate sign-up labels, placeholders, validation errors, password hint text, and submit states to Polish.

**Contract**: Keep `MIN_PASSWORD_LENGTH`, field names, validation conditions, and form action unchanged. Ensure the password-length hint handles Polish pluralization acceptably for the current fixed threshold; a simple natural phrase is enough.

#### 3. Password toggle accessibility label

**File**: `src/components/auth/PasswordToggle.tsx`

**Intent**: Translate screen-reader labels for showing/hiding password.

**Contract**: Keep button behavior and icon logic unchanged. Translate only the `aria-label` values.

#### 4. Shared auth error rendering check

**Files**: `src/components/auth/ServerError.tsx`, `src/components/auth/FormField.tsx`, `src/components/auth/SubmitButton.tsx`

**Intent**: Verify shared auth components do not embed English visible copy beyond what is passed from callers.

**Contract**: If no English user-facing strings exist, leave these files unchanged. If any hidden/accessibility user-facing copy exists, translate it without changing component APIs.

### Success Criteria:

#### Automated Verification:

- Auth form TypeScript/JSX still lint cleanly: `npm run lint`
- Existing test suite passes: `npm run test`

#### Manual Verification:

- Empty and invalid sign-in/sign-up submissions show Polish validation messages.
- Password show/hide controls remain usable and have Polish accessibility labels.
- Pending submit button text is Polish.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Garden Queue UI

### Overview

Translate the main garden queue React UI, including form labels, section headings, empty states, success/error messages, loading states, queue-card labels, plant management, weed observations, weeding history, and delete confirmation states.

### Changes Required:

#### 1. Garden bed form and queue summary

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Translate the add-rabata form, weed-level labels/descriptions, queue heading, queue summary, loading state, empty state, refresh controls, and success/fallback errors for loading/creating/deleting rabaty.

**Contract**: Preserve component state shape, API calls, payload fields, and queue rendering logic. Use “rabata” consistently for bed-related labels and messages.

#### 2. Queue item cards and priority labels

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Translate item-card labels such as weed level, area, work time, mulch depth, suggested next weeding, priority confidence, optional-details fallback, and delete controls.

**Contract**: Preserve `BedQueuePriority`, `PriorityConfidence`, and other typed enum values; translate only labels derived from those values. Do not rename API/data enum values.

#### 3. Plant management UI

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Translate the plant section labels, form fields, validation messages, empty state, loading/error messages, and add-plant success/pending text.

**Contract**: Preserve plant payload fields and validation semantics. Use natural Polish for optional plant details and year/quantity/size labels.

#### 4. Weed observation UI

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Translate the weed observation section around the already-Polish weed catalog labels: headings, helper text, form fields, severity labels, note labels, validation, empty state, loading/error messages, and success/pending text.

**Contract**: Preserve imports and existing Polish constants from `src/lib/weed-observations.ts`. Do not change catalog slugs or enum values.

#### 5. Weeding history and mark-weeded UI

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Translate the “mark weeded” and weeding history flows, including form labels, validation, loading/error states, success messages, and history details.

**Contract**: Preserve API calls to `/mark-weeded` and `/weeding-events`, payload shape, and validation semantics. Use “pielenie” consistently for the action/history.

### Success Criteria:

#### Automated Verification:

- Garden queue component lint passes: `npm run lint`
- Existing unit tests pass: `npm run test`

#### Manual Verification:

- `/garden` shows Polish text across the add-rabata form, queue list, expanded plant section, weed observation section, and weeding history section.
- Creating, deleting, expanding, and validation-error states do not surface English fallback copy.
- Existing garden queue interactions still behave as before.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Visible Domain Validation Messages and Polish Date Formatting

### Overview

Translate user-visible validation messages returned from domain helpers/API surfaces and force visible date formatting to Polish locale.

### Changes Required:

#### 1. Garden bed domain messages

**File**: `src/lib/garden-beds.ts`

**Intent**: Translate validation errors and user-facing reason/pressure labels that can appear in the UI or API responses.

**Contract**: Preserve exported types, function signatures, enum values, scoring logic, and validation conditions. Translate only returned message strings and labels.

#### 2. Plant domain messages

**File**: `src/lib/bed-plants.ts`

**Intent**: Translate validation errors for plant payloads, plant name, and planted year constraints.

**Contract**: Preserve `MIN_PLANTED_YEAR`, validation behavior, payload conversion, and response shaping.

#### 3. Weeding-event domain messages

**File**: `src/lib/weeding-events.ts`

**Intent**: Translate validation errors for marking a rabata as weeded.

**Contract**: Preserve date validation direction: `weeded_at` accepts only today or past dates, matching the existing lesson about date direction semantics.

#### 4. Weed-observation domain messages

**File**: `src/lib/weed-observations.ts`

**Intent**: Translate remaining English validation errors while preserving already-Polish weed catalog labels and helper text.

**Contract**: Preserve category/stage/coverage enum values, catalog slugs, default risk traits, and validation logic.

#### 5. Visible date formatting

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Format displayed dates with Polish locale.

**Contract**: Replace the visible date formatter locale with `"pl-PL"`. Do not change stored date values, ISO payloads, date inputs, or date validation.

### Success Criteria:

#### Automated Verification:

- Unit tests for domain helpers pass: `npm run test`
- Lint passes: `npm run lint`

#### Manual Verification:

- API/domain validation errors that reach the UI read as Polish user-facing messages.
- Visible formatted dates in the garden queue use Polish locale formatting.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Final Verification and Polish UI Review

### Overview

Run the repository validation gate and manually review the main UI flows for language consistency.

### Changes Required:

#### 1. Standard repository gate

**Files**: Repository-wide verification commands

**Intent**: Confirm translation changes did not break generated Astro types, lint rules, unit tests, or production build.

**Contract**: Run the project-standard commands from `AGENTS.md`: `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build`.

#### 2. Manual UI language pass

**Files**: Main frontend routes and interactive states

**Intent**: Check that the user-facing app no longer mixes English and Polish in current frontend flows.

**Contract**: Manually review `/`, `/auth/signin`, `/auth/signup`, `/auth/confirm-email` where reachable, `/dashboard`, and `/garden`. Exercise garden queue empty/loading/error-ish states where practical, validation failures, and expanded sections.

### Success Criteria:

#### Automated Verification:

- Astro sync passes: `npx astro sync`
- Lint passes: `npm run lint`
- Unit tests pass: `npm run test`
- Production build passes: `npm run build`

#### Manual Verification:

- Main frontend routes and current interactive states show Polish user-facing copy.
- No obvious starter-product copy remains on the landing page.
- No route, auth, garden queue, or form behavior regression is observed during manual review.

**Implementation Note**: This is the final verification phase. Record any deliberately accepted remaining English strings, if any, in the implementation handoff rather than silently leaving them.

---

## Testing Strategy

### Unit Tests:

- Run the existing Vitest suite with `npm run test` to ensure domain helper behavior remains unchanged after translating messages.
- Do not add translation-specific snapshot tests in this change.

### Integration Tests:

- No new integration tests are required for this copy/localization change.
- The production build (`npm run build`) is the main integration-level guard for Astro/React compilation.

### Manual Testing Steps:

1. Visit `/` and confirm the landing page is Polish and product-focused.
2. Visit `/auth/signin` and `/auth/signup`; submit empty/invalid forms and confirm Polish validation messages.
3. Confirm password show/hide controls remain usable.
4. Visit `/dashboard` as an authenticated user and confirm Polish copy/navigation.
5. Visit `/garden`; review empty/loading/normal queue states and create-form labels.
6. Expand plant, weed-observation, and weeding-history sections where test data allows; confirm Polish copy and preserved behavior.
7. Trigger practical validation errors in garden forms and confirm Polish messages.

## Performance Considerations

This is a static copy and formatting change. It should not affect network usage, bundle structure meaningfully, or queue performance. Forcing `pl-PL` in `Intl.DateTimeFormat` has negligible runtime impact.

## Migration Notes

No database, Supabase, route, or data migration is required. Existing persisted values and enum strings remain unchanged; only displayed labels/messages change.

## References

- Change record: `context/changes/use-polish-language-across-app/change.md`
- Recurring rule: `context/foundation/lessons.md` → “Always use Polish language in the interface”
- Static UI: `src/components/Welcome.astro`, `src/components/Topbar.astro`, `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`, `src/pages/dashboard.astro`, `src/pages/garden.astro`
- Auth UI: `src/components/auth/SignInForm.tsx`, `src/components/auth/SignUpForm.tsx`, `src/components/auth/PasswordToggle.tsx`
- Garden UI: `src/components/garden/GardenQueue.tsx`
- User-visible validation/domain messages: `src/lib/garden-beds.ts`, `src/lib/bed-plants.ts`, `src/lib/weeding-events.ts`, `src/lib/weed-observations.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Static Pages and Navigation

#### Automated

- [x] 1.1 Astro sync passes: `npx astro sync` — 35bb90e
- [x] 1.2 Lint passes for changed files: `npm run lint` — 35bb90e

#### Manual

- [x] 1.3 Landing page, top navigation, dashboard, auth pages, and garden page shell show Polish copy with no obvious English starter text. — 35bb90e
- [x] 1.4 Existing links still navigate to the same routes. — 35bb90e

### Phase 2: Auth Forms and Accessibility Text

#### Automated

- [x] 2.1 Auth form TypeScript/JSX still lint cleanly: `npm run lint` — b834c70
- [x] 2.2 Existing test suite passes: `npm run test` — b834c70

#### Manual

- [x] 2.3 Empty and invalid sign-in/sign-up submissions show Polish validation messages. — b834c70
- [x] 2.4 Password show/hide controls remain usable and have Polish accessibility labels. — b834c70
- [x] 2.5 Pending submit button text is Polish. — b834c70

### Phase 3: Garden Queue UI

#### Automated

- [x] 3.1 Garden queue component lint passes: `npm run lint` — c9e6222
- [x] 3.2 Existing unit tests pass: `npm run test` — c9e6222

#### Manual

- [x] 3.3 `/garden` shows Polish text across the add-rabata form, queue list, expanded plant section, weed observation section, and weeding history section. — c9e6222
- [x] 3.4 Creating, deleting, expanding, and validation-error states do not surface English fallback copy. — c9e6222
- [x] 3.5 Existing garden queue interactions still behave as before. — c9e6222

### Phase 4: Visible Domain Validation Messages and Polish Date Formatting

#### Automated

- [x] 4.1 Unit tests for domain helpers pass: `npm run test`
- [x] 4.2 Lint passes: `npm run lint`

#### Manual

- [x] 4.3 API/domain validation errors that reach the UI read as Polish user-facing messages.
- [x] 4.4 Visible formatted dates in the garden queue use Polish locale formatting.

### Phase 5: Final Verification and Polish UI Review

#### Automated

- [ ] 5.1 Astro sync passes: `npx astro sync`
- [ ] 5.2 Lint passes: `npm run lint`
- [ ] 5.3 Unit tests pass: `npm run test`
- [ ] 5.4 Production build passes: `npm run build`

#### Manual

- [ ] 5.5 Main frontend routes and current interactive states show Polish user-facing copy.
- [ ] 5.6 No obvious starter-product copy remains on the landing page.
- [ ] 5.7 No route, auth, garden queue, or form behavior regression is observed during manual review.
