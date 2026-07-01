# Fix State in FE App — Plan Brief

> Full plan: `context/changes/fix-state-in-fe-app/plan.md`

## What & Why

Fix the Cloudflare/Astro dev-runtime crash where stateful React islands throw `Cannot read properties of null (reading 'useState')` during server rendering. The root issue appears at the Astro island boundary: `client:load` still server-renders React components before hydration, and that SSR path is failing for hook-based islands in workerd.

## Starting Point

The reported stack trace points to `GardenQueue`, but reproduction also triggered the same invalid hook call on `SignInForm`. Current stateful islands use `client:load` in auth pages and the garden page shell.

## Desired End State

`/auth/signin`, `/auth/signup`, `/garden`, and authenticated `/` no longer crash in the dev runtime. The Astro shell renders immediately, a short Polish fallback appears while JavaScript loads, and the React island takes over after hydration with existing behavior intact.

## Key Decisions Made

| Decision     | Choice                                             | Why                                                                                                |
| ------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Fix strategy | Use `client:only="react"`                          | It directly avoids the failing React SSR path with the smallest safe change.                       |
| Scope        | All current stateful React islands                 | Sign-in reproduced the same hook crash, so fixing only GardenQueue would leave the bug class open. |
| Fallback UX  | Minimal Polish loading fallback                    | It avoids blank UI while keeping the bug fix small and aligned with the Polish UI lesson.          |
| Validation   | Full repo gate plus targeted manual runtime checks | Static checks alone may miss this workerd/dev-server failure mode.                                 |

## Scope

**In scope:**

- `SignInForm` island call site in `src/pages/auth/signin.astro`.
- `SignUpForm` island call site in `src/pages/auth/signup.astro`.
- `GardenQueue` island call site in `src/components/garden/GardenPage.astro`.
- Minimal Polish fallback content for each client-only island.
- Full command gate and targeted manual route checks.

**Out of scope:**

- React component state refactors.
- Supabase/API/data model changes.
- Broad React/Vite/Cloudflare dependency investigation unless the fix fails.
- Full skeleton loading UI.

## Architecture / Approach

Keep Astro responsible for page shells, routing, topbar, auth cards, garden hero, and layout. Move the stateful React islands to client-only rendering so hooks execute only in the browser, not during Cloudflare SSR. Add fallback markup at the Astro call sites to preserve a readable loading state.

## Phases at a Glance

| Phase                               | What it delivers                                                         | Key risk                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1. React Island SSR Boundary Fix    | Converts affected islands to `client:only="react"` with Polish fallbacks | Accidentally changing props or removing the visible shell around islands.        |
| 2. Verification and Regression Pass | Confirms repo gate and runtime route smoke checks pass                   | Automated tests may pass even if manual dev-runtime reproduction is not checked. |

**Prerequisites:** Ability to run the Astro dev server and, for authenticated route checks, use existing local auth/test state.  
**Estimated effort:** ~1 short session across 2 phases.

## Open Risks & Assumptions

- Assumes client-only rendering is acceptable for these highly interactive islands.
- If the invalid hook call persists after `client:only="react"`, the fallback plan is deeper React/Vite/Cloudflare runtime investigation.
- Authenticated `/garden` and `/` manual checks require local auth state or documented blocker.

## Success Criteria (Summary)

- The affected routes no longer log the React invalid hook call in dev.
- Auth forms and the garden queue hydrate and remain usable.
- `npx astro sync`, `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run build` pass or any environment blocker is documented.
