# Fix State in FE App Implementation Plan

## Overview

Fix the Cloudflare/Astro development runtime crash where stateful React islands fail during server rendering with `Cannot read properties of null (reading 'useState')`. The implementation will prevent Astro from SSR-rendering the current stateful React islands by switching them from `client:load` to `client:only="react"` and adding minimal Polish loading fallbacks.

## Current State Analysis

The app is an Astro SSR app deployed to Cloudflare Workers with React islands for interactive forms and the garden queue. The reported stack trace pointed to `GardenQueue`, but local reproduction showed the same invalid hook call on the auth sign-in page, so the issue is a shared React island SSR boundary problem rather than GardenQueue-specific state logic.

`client:load` controls hydration timing, but Astro still attempts to server-render the React component first. In the current Cloudflare/workerd dev runtime, that SSR path crashes before hydration for stateful React components using hooks. React and React DOM are deduped in `npm ls`, so the chosen fix is to bypass SSR for affected stateful islands instead of spending this change on deeper runtime dependency debugging.

## Desired End State

The affected pages no longer crash in the Cloudflare/Astro dev runtime. Auth forms and the garden queue load as client-only React islands, with short Polish fallback text visible while JavaScript loads. Existing form behavior, garden queue API calls, styling, routes, and Polish UI copy remain unchanged after hydration.

### Key Discoveries:

- `src/pages/auth/signin.astro:20` renders `SignInForm` with `client:load`, and local reproduction showed the same invalid hook call at `src/components/auth/SignInForm.tsx:13`.
- `src/pages/auth/signup.astro:20` renders `SignUpForm` with `client:load`, matching the sign-in island pattern.
- `src/components/garden/GardenPage.astro:23` renders `GardenQueue` with `client:load`, matching the reported stack trace at `src/components/garden/GardenQueue.tsx:255`.
- `npm ls react react-dom @astrojs/react astro vite` shows deduped `react@19.2.6` and `react-dom@19.2.6`, reducing evidence for a duplicate-React package issue.
- Repo rule from `context/foundation/lessons.md`: keep user-facing UI text Polish, including fallback/loading copy.

## What We're NOT Doing

- Not changing React component state logic, validation, handlers, API calls, or data flow.
- Not changing Supabase schema, RLS policies, auth backend behavior, or garden API contracts.
- Not adding new routes or changing `PROTECTED_ROUTES`.
- Not performing a broad React/Vite/Cloudflare dependency investigation unless the client-only fix fails verification.
- Not converting non-island supporting React components directly; only Astro call sites that instantiate stateful islands are in scope.
- Not adding full skeleton screens; fallback UX is intentionally minimal.

## Implementation Approach

Use Astro's client-only island directive for the current stateful React islands. This keeps the existing React components and behavior intact while preventing the Cloudflare SSR path from invoking hooks during server render. Add minimal `slot="fallback"` content at each call site so users see Polish loading text instead of blank space before hydration.

## Critical Implementation Details

### Timing & lifecycle

`client:only="react"` skips server rendering for the component, so any HTML previously produced by React during SSR will not exist until the browser loads and hydrates the island. The Astro page shell, topbar, auth cards, and garden hero remain server-rendered, so the fallback should sit where the React island appears and should not duplicate form or queue behavior.

## Phase 1: React Island SSR Boundary Fix

### Overview

Convert the current stateful React island call sites from SSR-plus-hydration to client-only rendering with minimal Polish fallbacks.

### Changes Required:

#### 1. Sign-in form island boundary

**File**: `src/pages/auth/signin.astro`

**Intent**: Prevent Astro/Cloudflare SSR from invoking React hooks inside `SignInForm` while keeping the sign-in page shell and card server-rendered.

**Contract**: Replace the `SignInForm` island directive with `client:only="react"`. Preserve `serverError={error}`, the route, the surrounding card layout, Polish copy, and the form component's props. Add a minimal Polish fallback assigned to the island's `fallback` slot.

#### 2. Sign-up form island boundary

**File**: `src/pages/auth/signup.astro`

**Intent**: Apply the same client-only boundary to `SignUpForm` so the sign-up route does not hit the same React hook SSR failure.

**Contract**: Replace the `SignUpForm` island directive with `client:only="react"`. Preserve `serverError={error}`, the route, the surrounding card layout, Polish copy, and the form component's props. Add a minimal Polish fallback assigned to the island's `fallback` slot.

#### 3. Garden queue island boundary

**File**: `src/components/garden/GardenPage.astro`

**Intent**: Prevent server rendering of the large interactive `GardenQueue` component, matching the reported crash path while keeping the Astro shell, `Topbar`, hero copy, and user email server-rendered.

**Contract**: Replace the `GardenQueue` island directive with `client:only="react"`. Preserve the component import, no-props data flow, route composition through `/garden` and authenticated `/`, and all visible Polish shell copy. Add a minimal Polish fallback assigned to the island's `fallback` slot.

### Success Criteria:

#### Automated Verification:

- Astro sync passes: `npx astro sync`
- Lint passes: `npm run lint`
- Unit tests pass: `npm run test`
- Production build passes: `npm run build`

#### Manual Verification:

- `/auth/signin` renders without the invalid hook call and shows the sign-in form after hydration.
- `/auth/signup` renders without the invalid hook call and shows the sign-up form after hydration.
- `/garden` no longer triggers the `GardenQueue` `useState` SSR crash and shows the queue after hydration for an authenticated session.
- Authenticated `/` still renders the garden experience and does not reintroduce the hook crash.
- Minimal fallback text appears in Polish if the island is briefly unavailable before hydration.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Verification and Regression Pass

### Overview

Run the full handoff gate and perform targeted manual checks against the affected routes to confirm the runtime-specific failure is gone.

### Changes Required:

#### 1. Repository verification gate

**Files**: Repository-wide verification

**Intent**: Confirm the directive changes do not break Astro types, linting, unit tests, production build, or browser-level garden behavior.

**Contract**: Run the repository-required commands and record pass/fail in the Progress section during implementation. Include `npm run test:e2e` because the garden queue is one of the affected islands and existing E2E coverage exercises it.

#### 2. Targeted runtime smoke check

**Files**: Routes `/auth/signin`, `/auth/signup`, `/garden`, authenticated `/`

**Intent**: Verify the specific Cloudflare/Astro runtime error no longer reproduces on the pages that instantiate stateful React islands.

**Contract**: Start the dev server in the same mode that reproduced the failure, visit the affected routes, and confirm no `Cannot read properties of null (reading 'useState')` or invalid hook call appears in the terminal or browser. For authenticated routes, use the existing local auth/test state if available; if not available, document the blocker and at minimum verify redirect/login route behavior.

### Success Criteria:

#### Automated Verification:

- Astro sync passes after final changes: `npx astro sync`
- Lint passes after final changes: `npm run lint`
- Unit tests pass after final changes: `npm run test`
- E2E tests pass when the local authenticated Playwright/Supabase environment is available: `npm run test:e2e`
- Production build passes after final changes: `npm run build`

#### Manual Verification:

- Dev server no longer logs the React invalid hook call when `/auth/signin` is loaded.
- Dev server no longer logs the React invalid hook call when `/auth/signup` is loaded.
- Dev server no longer logs the React invalid hook call when `/garden` or authenticated `/` is loaded.
- The affected pages remain visually coherent: shell/card/hero content appears immediately, then the React island replaces the Polish fallback after hydration.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for final manual acceptance before handoff.

---

## Testing Strategy

### Unit Tests:

- Run the existing Vitest suite with `npm run test`; no new domain unit tests are expected because the change is at Astro island call sites, not domain logic.

### Integration Tests:

- Run `npm run test:e2e` to exercise the garden queue in a browser and confirm the client-only queue still supports existing tested flows.
- Rely on `npm run build` to catch Astro directive or integration errors in the Cloudflare-targeted production build.

### Manual Testing Steps:

1. Start the dev server with `npm run dev`.
2. Visit `/auth/signin`; confirm no invalid hook call appears and the form hydrates.
3. Visit `/auth/signup`; confirm no invalid hook call appears and the form hydrates.
4. Sign in or use the existing local authenticated test setup.
5. Visit `/garden`; confirm the garden shell appears and the queue hydrates without the `useState` crash.
6. Visit `/`; confirm authenticated root renders the garden experience without the same crash.
7. If possible, briefly throttle JavaScript/network in the browser and confirm Polish fallback text is acceptable while islands load.

## Performance Considerations

Client-only rendering shifts the affected React island HTML generation to the browser. This is acceptable for these interactive forms and dashboard because the Astro shell remains server-rendered and the components already depend on client-side state and fetches. Avoid adding heavy skeletons or extra client dependencies for this bug fix.

## Migration Notes

No database, API, data, or secret migration is required. This is an Astro directive and fallback-markup change only.

## References

- Change identity: `context/changes/fix-state-in-fe-app/change.md`
- Reproduced sign-in failure surface: `src/pages/auth/signin.astro`, `src/components/auth/SignInForm.tsx`
- Sign-up island: `src/pages/auth/signup.astro`, `src/components/auth/SignUpForm.tsx`
- Garden island: `src/components/garden/GardenPage.astro`, `src/components/garden/GardenQueue.tsx`
- Cloudflare/Astro config: `astro.config.mjs`
- Polish UI rule: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: React Island SSR Boundary Fix

#### Automated

- [x] 1.1 Astro sync passes: `npx astro sync`
- [x] 1.2 Lint passes: `npm run lint`
- [x] 1.3 Unit tests pass: `npm run test`
- [x] 1.4 Production build passes: `npm run build`

#### Manual

- [x] 1.5 `/auth/signin` renders without the invalid hook call and shows the sign-in form after hydration
- [x] 1.6 `/auth/signup` renders without the invalid hook call and shows the sign-up form after hydration
- [x] 1.7 `/garden` no longer triggers the `GardenQueue` `useState` SSR crash and shows the queue after hydration for an authenticated session
- [x] 1.8 Authenticated `/` still renders the garden experience and does not reintroduce the hook crash
- [x] 1.9 Minimal fallback text appears in Polish if the island is briefly unavailable before hydration

### Phase 2: Verification and Regression Pass

#### Automated

- [ ] 2.1 Astro sync passes after final changes: `npx astro sync`
- [ ] 2.2 Lint passes after final changes: `npm run lint`
- [ ] 2.3 Unit tests pass after final changes: `npm run test`
- [ ] 2.4 E2E tests pass when the local authenticated Playwright/Supabase environment is available: `npm run test:e2e`
- [ ] 2.5 Production build passes after final changes: `npm run build`

#### Manual

- [ ] 2.6 Dev server no longer logs the React invalid hook call when `/auth/signin` is loaded
- [ ] 2.7 Dev server no longer logs the React invalid hook call when `/auth/signup` is loaded
- [ ] 2.8 Dev server no longer logs the React invalid hook call when `/garden` or authenticated `/` is loaded
- [ ] 2.9 The affected pages remain visually coherent: shell/card/hero content appears immediately, then the React island replaces the Polish fallback after hydration
