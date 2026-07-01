# Garden Weed Planner

Garden Weed Planner is an MVP web app for deciding which garden bed should be weeded first. A signed-in user records beds, plants, weed observations, and completed weeding events. The app then computes a priority queue with `OK`, `wkrótce`, and `pilne` labels plus a suggested next-weeding date.

The product foundation is documented in [`context/foundation/prd.md`](context/foundation/prd.md). The test strategy is documented in [`context/foundation/test-plan.md`](context/foundation/test-plan.md).

## Core MVP Features

- Email/password authentication with Supabase Auth.
- Protected `/garden` area for signed-in users.
- Per-user garden bed records stored in Supabase with row-level security.
- CRUD flow for garden beds:
  - create beds,
  - list/read owned beds,
  - mark a bed as weeded, which updates persisted bed state,
  - delete owned beds.
- Plant lists per bed.
- Weed observations per bed, including category, growth stage, coverage, severity, and risk traits.
- Weeding history per bed.
- Rule-based priority calculation from last-weeding date, weed level, area, estimated work time, mulch depth, and recent weed observations.

## Tech Stack

- Astro 6 SSR
- React 19 islands for interactive garden/auth UI
- TypeScript
- Tailwind CSS 4
- Supabase Auth + Postgres + RLS
- Cloudflare Workers adapter
- Vitest for domain-unit tests
- Playwright for browser smoke tests

## Requirements

- Node.js `22.14.0` from [`.nvmrc`](.nvmrc)
- npm
- Supabase CLI for local database/auth development
- Docker if running Supabase locally

## Environment Variables

The app reads Supabase configuration server-side through Astro env declarations.

Create local env files from the example:

```bash
cp .env.example .env
cp .env.example .dev.vars
```

Set:

```bash
SUPABASE_URL=<your Supabase project URL>
SUPABASE_KEY=<your Supabase anon key>
```

Do not commit real Supabase values. `.dev.vars` is for local Cloudflare/Worker secrets.

## Local Setup

Install dependencies:

```bash
npm ci
```

Start Supabase locally if you are not using a hosted project:

```bash
npx supabase start
```

Apply database migrations:

```bash
npx supabase db reset
```

Run Astro type/env sync:

```bash
npx astro sync
```

Start the development server:

```bash
npm run dev
```

Open the app at `http://localhost:4321`.

## Database Model

Supabase migrations live in [`supabase/migrations/`](supabase/migrations/). The main persisted resources are:

- `public.garden_beds` — owned garden beds and queue inputs.
- `public.garden_bed_plants` — plants assigned to a bed.
- `public.garden_bed_weed_observations` — weed pressure observations for priority scoring.
- `public.garden_bed_weeding_events` — completed weeding history.
- `public.mark_garden_bed_weeded(...)` — transactional RPC that inserts a weeding event and updates the bed summary.

Tables use `user_id` ownership and Supabase RLS policies so users can access only their own garden data.

## Useful Routes

- `/` — landing page
- `/auth/signin` — sign in
- `/auth/signup` — sign up
- `/auth/confirm-email` — post-signup confirmation page
- `/garden` — protected garden queue and management UI

API endpoints are under `src/pages/api/`, including auth routes and nested garden-bed routes.

## Development Commands

```bash
npm run dev              # Start local Astro dev server
npx astro sync           # Generate Astro types/env metadata
npm run lint             # Run ESLint
npm run test             # Run Vitest unit tests
npm run test:e2e         # Run Playwright E2E smoke tests
npm run test:pre-push    # Run unit + E2E tests
npm run build            # Build for Cloudflare Workers
npm run preview          # Preview production build
npm run format           # Format files with Prettier
```

Before handing off app or config changes, run:

```bash
npx astro sync
npm run lint
npm run test
npm run build
```

## Testing

The risk-based test plan is in [`context/foundation/test-plan.md`](context/foundation/test-plan.md).

Current test coverage includes:

- Domain priority/date tests in `src/lib/garden-beds.test.ts`.
- Weed observation validation tests in `src/lib/weed-observations.test.ts`.
- Weeding-event validation tests in `src/lib/weeding-events.test.ts`.
- Playwright smoke tests in `e2e/` for priority queue behavior and add/delete UI sync.

Unit tests must stay deterministic and must not depend on real Supabase secrets or `.dev.vars` contents.

## Project Structure

```text
src/
  components/
    auth/       # React auth form components
    garden/     # Garden queue React island and page shell
    ui/         # shadcn/ui-style primitives
  lib/          # Domain logic, Supabase client, helpers, tests
  pages/
    api/        # Astro API routes
    auth/       # Auth pages
    garden.astro
  middleware.ts # Auth loading and protected route enforcement
supabase/
  migrations/   # Database schema, RLS, RPCs
context/
  foundation/   # Product, stack, deployment, roadmap, and test docs
e2e/            # Playwright tests
```

## Deployment Notes

The app is configured for Cloudflare Workers. Build with:

```bash
npm run build
```

Deploy with Wrangler after setting Supabase secrets in Cloudflare:

```bash
npx wrangler deploy
```

See [`context/foundation/deploy-plan.md`](context/foundation/deploy-plan.md) for deployment context.

## 10xBuilder Review Notes

This MVP is intentionally focused on technical foundations:

- persisted user-owned resources,
- complete garden-bed CRUD flow,
- domain-specific priority logic,
- authentication and authorization boundaries,
- risk-based automated tests,
- written product foundation in `context/foundation/`.

Visual design, styling polish, accessibility, and live hosting status are intentionally outside this README's technical-certification scope.
