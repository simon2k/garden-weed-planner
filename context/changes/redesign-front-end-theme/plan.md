# Redesign Front End Theme Implementation Plan

## Overview

Implement a light, pastel garden visual redesign across the app shell, auth pages, public landing, and garden dashboard. The change replaces the current dark cosmic presentation with a bright, airy UI, uses a local garden-bed background asset for auth, makes `/` show the garden experience for authenticated users, and widens `/garden` so the dashboard feels less narrow and vertical.

## Current State Analysis

The app currently mixes a neutral shadcn token base with dark, cosmic page-level styling. The core garden feature is already implemented and tested, so this plan intentionally changes presentation and routing composition without changing Supabase data flow, API contracts, or garden queue business logic.

`/api/auth/signin` redirects successful sign-ins to `/`, but `/` always renders the public `Welcome` component today. `/garden` is protected and renders the garden queue inside a `max-w-5xl` dark layout. `GardenQueue` contains many embedded dark Tailwind classes, so the redesign must be deliberate and broad enough to avoid leaving dark islands behind.

## Desired End State

The application has a coherent light theme: pastel garden colors, bright surfaces, readable dark text, soft borders/shadows, and lighter rectangular buttons. Auth pages use a local optimized garden-bed background image. Unauthenticated users see a redesigned public landing page at `/`; authenticated users visiting `/` see the garden experience directly. `/garden` uses a wider responsive dashboard layout and keeps all existing garden interactions working.

### Key Discoveries:

- `src/styles/global.css:6` defines CSS variables and `src/styles/global.css:113` defines the current `bg-cosmic` dark background utility.
- `src/pages/auth/signin.astro:9` and `src/pages/auth/signup.astro:9` use `bg-cosmic` and dark translucent auth cards.
- `src/pages/api/auth/signin.ts:19` already redirects successful login to `/`, making root-route behavior the main integration point.
- `src/pages/index.astro:6` always renders `Welcome`, so it needs auth-aware branching.
- `src/pages/garden.astro:10` uses a dark page shell and `src/pages/garden.astro:11` constrains content to `max-w-5xl`.
- `src/components/garden/GardenQueue.tsx:828` starts the main queue layout and contains most dark UI classes used by the dashboard.
- `src/components/ui/button.tsx:7` centralizes shadcn button variants and is the correct place for global button shape defaults.
- E2E tests in `e2e/seed.spec.ts` and `e2e/priority-queue.spec.ts` rely on Polish accessible labels and `/garden`; redesign should preserve those labels.

## What We're NOT Doing

- Not changing Supabase schema, RLS policies, or API response contracts.
- Not changing garden queue scoring, validation rules, or CRUD behavior.
- Not splitting `GardenQueue` into smaller React components during this change.
- Not adding a dark/light theme toggle.
- Not replacing Polish UI copy with English; all user-facing UI remains Polish.
- Not adding new protected routes beyond the existing `/dashboard` and `/garden` routes.

## Implementation Approach

Use a theme-foundation-first approach: create light garden tokens/utilities and update shared button styling, then apply them to auth and landing pages, then restyle the garden dashboard. Keep behavior changes narrow: root route becomes auth-aware and reuses the existing garden experience, while `/garden` remains available as the canonical protected route used by tests and navigation.

## Critical Implementation Details

### User experience spec

Use `Pastel garden` as the visual direction: bright cream/white surfaces, sage and soft green accents, muted flower colors, gentle shadows, and readable dark text. Keep decorative backgrounds behind sufficient overlays so form labels, inputs, and validation errors remain accessible.

### Timing & lifecycle

Do not change the successful sign-in redirect unless root-route branching proves impossible. Since `src/pages/api/auth/signin.ts` already redirects to `/`, implementing authenticated `/` rendering preserves the existing post-login flow with less churn.

## Phase 1: Theme Foundations and Auth Background

### Overview

Create the light garden design foundation and apply it to auth pages without changing auth form validation or server actions.

### Changes Required:

#### 1. Global theme tokens and utilities

**File**: `src/styles/global.css`

**Intent**: Replace the dark cosmic visual foundation with light garden-friendly CSS variables and reusable background/surface utilities. Keep Tailwind 4 and shadcn variable conventions intact.

**Contract**: Preserve existing variable names consumed by `@theme inline`; introduce or replace page background utilities so pages can use a light garden background instead of `bg-cosmic`. Existing base `body` styling must continue to use `bg-background text-foreground`.

#### 2. Shared button shape and light variants

**File**: `src/components/ui/button.tsx`

**Intent**: Make buttons feel lighter and more rectangular throughout the application.

**Contract**: Keep the exported `Button` and `buttonVariants` API unchanged. Adjust base radius and variant classes only; variants and sizes remain available so existing call sites do not need logic changes.

#### 3. Local auth background asset

**File**: `public/images/garden-bed-auth-bg.webp`

**Intent**: Add a local optimized garden-bed image used by sign-in and sign-up pages.

**Contract**: Store the image under `public/images/` and reference it by root-relative URL. Use a reasonably optimized `.webp` so the auth page does not depend on external image hosts.

#### 4. Sign-in page redesign

**File**: `src/pages/auth/signin.astro`

**Intent**: Replace the dark cosmic login screen with a bright garden-bed background, readable overlay, and pastel garden auth card.

**Contract**: Keep `SignInForm serverError={error} client:load`, the page route, and Polish copy. Only update layout/styling around the form.

#### 5. Sign-up page redesign

**File**: `src/pages/auth/signup.astro`

**Intent**: Match the sign-up page to the same light auth visual system as sign-in.

**Contract**: Keep `SignUpForm serverError={error} client:load`, the page route, and Polish copy. Use the same background system and card treatment as sign-in.

#### 6. Auth form supporting styles

**Files**: `src/components/auth/FormField.tsx`, `src/components/auth/PasswordToggle.tsx`, `src/components/auth/ServerError.tsx`, `src/components/auth/SubmitButton.tsx`

**Intent**: Ensure auth fields, toggles, server errors, and submit buttons remain readable on light cards.

**Contract**: Preserve component props and form field names. Update only class names and visual treatment.

#### 7. Email confirmation page redesign

**File**: `src/pages/auth/confirm-email.astro`

**Intent**: Keep the post-signup confirmation screen visually consistent with the redesigned auth pages.

**Contract**: Preserve the route, Polish copy, DEV/prod confirmation message behavior, and link to `/auth/signin`. Update only layout/styling so it uses the same light garden auth background and card treatment as sign-in/sign-up.

### Success Criteria:

#### Automated Verification:

- Astro types/components sync passes: `npx astro sync`
- Lint passes for changed UI files: `npm run lint`
- Unit tests still pass: `npm run test`

#### Manual Verification:

- `/auth/signin` shows a light garden-bed background from a local asset, with readable form text and errors.
- `/auth/signup` visually matches sign-in and remains readable on desktop and mobile widths.
- `/auth/confirm-email` visually matches the auth light theme and remains readable in both DEV and production message variants.
- Buttons on auth pages look rectangular/lighter while preserving visible focus and disabled states.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Root Route and Public Landing Alignment

### Overview

Make `/` auth-aware and redesign the public landing page so logged-out users see a coherent light garden introduction while logged-in users see the garden experience.

### Changes Required:

#### 1. Auth-aware root page

**File**: `src/pages/index.astro`

**Intent**: Render the garden experience for authenticated users and the public landing page for guests.

**Contract**: Use `Astro.locals.user` as the branch source. For authenticated users, render the same core page experience as `/garden` without duplicating business logic where practical. For guests, render the redesigned public landing.

#### 2. Garden page composition extraction if needed

**File**: `src/components/garden/GardenPage.astro` or equivalent small Astro component

**Intent**: Avoid duplicating the full garden shell between `/` and `/garden` if root renders garden content directly.

**Contract**: The component should compose `Topbar`, the garden hero/header, and `GardenQueue client:load`. It must not change `GardenQueue` props or data flow.

#### 3. Public landing redesign

**File**: `src/components/Welcome.astro`

**Intent**: Replace the dark cosmic landing page with a bright pastel garden landing that keeps product explanation and CTA links.

**Contract**: Preserve Polish copy intent, routes to `/auth/signin` and `/auth/signup`, and responsive behavior. Remove cosmic star/orb visuals in favor of light garden motifs.

#### 4. Top navigation light treatment

**File**: `src/components/Topbar.astro`

**Intent**: Make the shared topbar readable and visually consistent on light garden pages.

**Contract**: Keep the auth-aware link/form behavior and route targets unchanged. Preserve Polish labels: `Panel`, `Ogród`, `Wyloguj`, `Zaloguj`, `Utwórz konto`.

### Success Criteria:

#### Automated Verification:

- Astro sync passes after route/component composition changes: `npx astro sync`
- Lint passes: `npm run lint`
- Unit tests still pass: `npm run test`

#### Manual Verification:

- Logged-out `/` shows the light redesigned public landing page with working sign-in/sign-up CTAs.
- Logged-in `/` shows the garden experience directly without first showing the public landing.
- `/garden` remains accessible and shows the same garden experience for authenticated users.
- Topbar text and actions are readable on both public and authenticated light pages.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Garden Dashboard Layout and Component Restyling

### Overview

Widen and restyle `/garden` and `GardenQueue` to remove the narrow dark dashboard feel while preserving all React state, API calls, labels, and interactions.

### Changes Required:

#### 1. Garden page shell width and hero

**File**: `src/pages/garden.astro` or extracted `src/components/garden/GardenPage.astro`

**Intent**: Make the garden page use a wider, airy dashboard shell.

**Contract**: Replace `max-w-5xl` with a wider responsive container such as `max-w-7xl`; keep page title, `Topbar`, user email display, and `GardenQueue client:load`. Use light background and dark readable text.

#### 2. GardenQueue main layout and panels

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Convert the queue UI from dark glass cards to pastel light cards and use the available desktop width more effectively.

**Contract**: Preserve component state, fetch URLs, form field names, submit handlers, validation, success/error behavior, and accessible labels used by tests. Change class names/layout only.

#### 3. GardenQueue form controls and nested sections

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Make inputs, selects, nested plant/observation/weeding sections, empty states, and confirmation states readable in the light theme.

**Contract**: Keep every control's semantic element and label text stable unless a Polish wording improvement is necessary. Maintain field validation behavior and existing error copy.

#### 4. Priority badges and status accents

**File**: `src/components/garden/GardenQueue.tsx`

**Intent**: Adapt urgent/soon/ok badges and confidence/status messages to light surfaces.

**Contract**: Keep priority labels and ordering unchanged. Update only color classes so badges remain high-contrast on the light theme.

#### 5. Dashboard route cleanup

**File**: `src/pages/dashboard.astro`

**Intent**: Prevent the legacy dashboard page from feeling visually broken if users navigate there from the topbar.

**Contract**: Keep route behavior and sign-out form unchanged. Apply the same light topbar/card/button treatment, or consider reducing its visual prominence if `/garden` is now the primary authenticated experience.

### Success Criteria:

#### Automated Verification:

- Lint passes after GardenQueue class/layout changes: `npm run lint`
- Unit tests still pass: `npm run test`
- Existing E2E smoke/priority specs pass when auth state and Supabase test environment are available: `npm run test:e2e`

#### Manual Verification:

- `/garden` no longer feels narrow on desktop; content uses a wider `max-w-7xl`-style layout while remaining usable on mobile.
- Adding, deleting, refreshing, marking weeded, adding observations, and adding plants still work through the UI.
- No dark cosmic panels, unreadable white-on-light text, or leftover dark-only controls remain in the garden dashboard.
- Priority badges, validation errors, success messages, and confirmation panels are readable and visually consistent.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Verification and Visual Regression Pass

### Overview

Run the repository handoff gates and perform a final visual/behavioral pass across auth, public, root, and garden flows.

### Changes Required:

#### 1. Required command gate

**Files**: Repository-wide verification

**Intent**: Confirm the redesign does not break Astro, linting, unit tests, or Cloudflare-targeted build.

**Contract**: Run the repo-required commands before handoff: `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build`.

#### 2. Optional E2E gate

**Files**: `e2e/seed.spec.ts`, `e2e/priority-queue.spec.ts`

**Intent**: Validate that key garden flows still work at browser level when the local authenticated Playwright/Supabase environment is configured.

**Contract**: Run `npm run test:e2e` if the required auth storage state and test backend are available. If unavailable, document the blocker explicitly in handoff notes.

#### 3. Manual responsive QA

**Files**: User-facing routes `/`, `/auth/signin`, `/auth/signup`, `/garden`, `/dashboard`

**Intent**: Catch visual regressions that automated tests will not detect.

**Contract**: Check mobile, tablet, and desktop widths; verify focus states, contrast, local image loading, and no horizontal overflow.

### Success Criteria:

#### Automated Verification:

- Astro sync passes: `npx astro sync`
- Lint passes: `npm run lint`
- Unit tests pass: `npm run test`
- Production build passes: `npm run build`
- E2E passes or the environment blocker is documented: `npm run test:e2e`

#### Manual Verification:

- Auth pages, public `/`, logged-in `/`, `/garden`, and `/dashboard` are visually coherent in the light pastel garden theme.
- Keyboard focus, hover, disabled, error, success, and destructive states remain visible.
- Local auth background image loads from `public/images/` and does not make form text hard to read.
- The implementation matches the chosen direction: light, airy, pastel garden, with rectangular lighter buttons.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for final manual acceptance before handoff.

---

## Testing Strategy

### Unit Tests:

- Run the existing Vitest domain-unit suite with `npm run test` to confirm no accidental domain regressions.
- No new domain unit tests are required unless implementation unexpectedly changes helper logic.

### Integration Tests:

- Keep existing Playwright tests focused on behavior rather than styling: `/garden` loads, a bed can be added/deleted, and priority ordering still works.
- If route composition changes introduce a reusable garden page component, ensure `/garden` remains the route used by existing E2E tests.

### Manual Testing Steps:

1. Visit `/auth/signin` and `/auth/signup` logged out; confirm local garden-bed background, readable fields, validation errors, and CTA links.
2. Visit `/` logged out; confirm public landing is light, Polish, and routes to auth pages.
3. Sign in; confirm redirect to `/` shows the garden experience directly.
4. Visit `/garden`; confirm it matches the logged-in root experience and uses a wider layout.
5. Use the garden UI to add and delete a bed; verify success/error/confirmation states remain readable.
6. Open nested plant, weed observation, and weeding panels; verify controls are light-theme safe.
7. Check mobile and desktop widths for overflow, cramped cards, or excessive vertical stacking.

## Performance Considerations

The only new performance-sensitive asset is the auth background image. Keep it local, optimized, and referenced as a static public asset. Avoid adding client-side JavaScript for purely decorative effects; prefer CSS backgrounds and existing Astro/React boundaries.

## Migration Notes

No database, API, or data migration is required. This change is presentation and route-composition only.

## References

- Change identity: `context/changes/redesign-front-end-theme/change.md`
- Product language rule: `context/foundation/lessons.md`
- Global theme: `src/styles/global.css`
- Button variants: `src/components/ui/button.tsx`
- Auth pages: `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`
- Root route: `src/pages/index.astro`
- Public landing: `src/components/Welcome.astro`
- Garden page: `src/pages/garden.astro`
- Garden dashboard: `src/components/garden/GardenQueue.tsx`
- Auth redirect: `src/pages/api/auth/signin.ts`
- E2E behavior references: `e2e/seed.spec.ts`, `e2e/priority-queue.spec.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Theme Foundations and Auth Background

#### Automated

- [x] 1.1 Astro types/components sync passes: `npx astro sync` — da653cd
- [x] 1.2 Lint passes for changed UI files: `npm run lint` — da653cd
- [x] 1.3 Unit tests still pass: `npm run test` — da653cd

#### Manual

- [x] 1.4 `/auth/signin` shows a light garden-bed background from a local asset, with readable form text and errors — da653cd
- [x] 1.5 `/auth/signup` visually matches sign-in and remains readable on desktop and mobile widths — da653cd
- [x] 1.6 `/auth/confirm-email` visually matches the auth light theme and remains readable in both DEV and production message variants — da653cd
- [x] 1.7 Buttons on auth pages look rectangular/lighter while preserving visible focus and disabled states — da653cd

### Phase 2: Root Route and Public Landing Alignment

#### Automated

- [x] 2.1 Astro sync passes after route/component composition changes: `npx astro sync`
- [x] 2.2 Lint passes: `npm run lint`
- [x] 2.3 Unit tests still pass: `npm run test`

#### Manual

- [x] 2.4 Logged-out `/` shows the light redesigned public landing page with working sign-in/sign-up CTAs
- [x] 2.5 Logged-in `/` shows the garden experience directly without first showing the public landing
- [x] 2.6 `/garden` remains accessible and shows the same garden experience for authenticated users
- [x] 2.7 Topbar text and actions are readable on both public and authenticated light pages

### Phase 3: Garden Dashboard Layout and Component Restyling

#### Automated

- [ ] 3.1 Lint passes after GardenQueue class/layout changes: `npm run lint`
- [ ] 3.2 Unit tests still pass: `npm run test`
- [ ] 3.3 Existing E2E smoke/priority specs pass when auth state and Supabase test environment are available: `npm run test:e2e`

#### Manual

- [ ] 3.4 `/garden` no longer feels narrow on desktop; content uses a wider `max-w-7xl`-style layout while remaining usable on mobile
- [ ] 3.5 Adding, deleting, refreshing, marking weeded, adding observations, and adding plants still work through the UI
- [ ] 3.6 No dark cosmic panels, unreadable white-on-light text, or leftover dark-only controls remain in the garden dashboard
- [ ] 3.7 Priority badges, validation errors, success messages, and confirmation panels are readable and visually consistent

### Phase 4: Verification and Visual Regression Pass

#### Automated

- [ ] 4.1 Astro sync passes: `npx astro sync`
- [ ] 4.2 Lint passes: `npm run lint`
- [ ] 4.3 Unit tests pass: `npm run test`
- [ ] 4.4 Production build passes: `npm run build`
- [ ] 4.5 E2E passes or the environment blocker is documented: `npm run test:e2e`

#### Manual

- [ ] 4.6 Auth pages, public `/`, logged-in `/`, `/garden`, and `/dashboard` are visually coherent in the light pastel garden theme
- [ ] 4.7 Keyboard focus, hover, disabled, error, success, and destructive states remain visible
- [ ] 4.8 Local auth background image loads from `public/images/` and does not make form text hard to read
- [ ] 4.9 The implementation matches the chosen direction: light, airy, pastel garden, with rectangular lighter buttons
