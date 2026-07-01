# Redesign Front End Theme — Plan Brief

> Full plan: `context/changes/redesign-front-end-theme/plan.md`

## What & Why

Redesign the app from a dark cosmic starter look into a bright, airy, pastel garden interface. The goal is to make auth, landing, and garden dashboard screens feel coherent with the product: light theme, garden-bed imagery, wider dashboard space, and lighter rectangular buttons.

## Starting Point

The current UI uses `bg-cosmic`, dark translucent cards, white text, and a `max-w-5xl` garden layout. The garden business logic and E2E flows already exist, so the plan keeps behavior stable and changes presentation plus root-route composition.

## Desired End State

Logged-out users see a light public landing page and auth pages with a local garden-bed background image. Logged-in users visiting `/` see the garden experience directly, while `/garden` remains available. The garden dashboard uses a wider `max-w-7xl`-style layout and light pastel cards without dark leftovers.

## Key Decisions Made

| Decision          | Choice                                         | Why (1 sentence)                                                                                  |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Root route        | `/` renders garden for authenticated users     | Preserves the existing login redirect to `/` while making the main feature immediate after login. |
| Public landing    | Keep and redesign                              | Keeps a useful product intro for logged-out visitors while avoiding visual mismatch.              |
| Auth background   | Local garden-bed asset in `public/`            | Stable, fast, and avoids external image/licensing risk.                                           |
| Visual direction  | Pastel garden                                  | Best matches “lekki, zwiewny” with a warmer, more decorative garden feel.                         |
| Garden width      | Wider responsive dashboard, around `max-w-7xl` | Fixes the narrow/long feel without making desktop layouts uncontrolled.                           |
| Buttons           | Smaller global radius/lighter variants         | Gives consistent rectangular buttons across the app.                                              |
| GardenQueue scope | Restyle layout/classes only                    | Reduces regression risk by preserving React logic, API calls, and tests.                          |

## Scope

**In scope:**

- Light garden theme foundations and utility classes.
- Local auth background image under `public/images/`.
- Redesign of sign-in, sign-up, landing, topbar, dashboard shell, and garden dashboard styling.
- Auth-aware `/` that shows garden content for logged-in users.
- Wider `/garden` layout and rectangular/lighter button treatment.

**Out of scope:**

- Supabase schema, RLS, API contracts, or scoring changes.
- Splitting `GardenQueue` into smaller components.
- Dark/light theme toggle.
- English UI copy.

## Architecture / Approach

The plan starts with shared theme and button foundations, then applies them to auth and landing screens, then restyles the garden dashboard. If `/` and `/garden` need the same authenticated view, extract a small Astro composition component for the garden page shell while keeping `GardenQueue` unchanged.

## Phases at a Glance

| Phase                                              | What it delivers                                                                  | Key risk                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1. Theme Foundations and Auth Background           | Light tokens, rectangular buttons, local auth background, redesigned auth screens | Background image or contrast makes auth forms hard to read.                      |
| 2. Root Route and Public Landing Alignment         | Auth-aware `/`, light public landing, light topbar                                | Duplicating garden page composition or changing redirect behavior unnecessarily. |
| 3. Garden Dashboard Layout and Component Restyling | Wider `/garden` and light `GardenQueue` styling                                   | Leaving dark nested panels or breaking accessible labels used by E2E tests.      |
| 4. Verification and Visual Regression Pass         | Required gates and responsive manual QA                                           | E2E may require local auth/Supabase state; document blocker if unavailable.      |

**Prerequisites:** local development environment with Node `22.14.0`, npm install complete, and a suitable auth background image ready or generated.
**Estimated effort:** ~2-3 implementation sessions across 4 phases.

## Open Risks & Assumptions

- A suitable optimized garden-bed image must exist or be generated before final auth polish.
- `npm run test:e2e` depends on configured Playwright auth state and Supabase test data.
- Because `GardenQueue` has many inline Tailwind classes, visual QA is important to catch dark leftovers.

## Success Criteria (Summary)

- Auth, public landing, logged-in `/`, `/garden`, and `/dashboard` all share a coherent light pastel garden look.
- Logged-in users land directly in the garden experience via `/` without losing `/garden` compatibility.
- Existing garden behavior and required repo gates (`astro sync`, lint, test, build) continue to pass.
