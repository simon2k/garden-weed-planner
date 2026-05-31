# Repository Guidelines

Garden Weed Planner is an Astro 6 SSR app on Cloudflare Workers with React 19 islands, TypeScript, Tailwind CSS 4, and Supabase auth. Product requirements live in @context/foundation/prd.md; deployment notes live in @context/foundation/deploy-plan.md.

## Critical Rules & Commands

- Use Node `22.14.0` from @.nvmrc and npm; CI installs with `npm ci`.
- Run `npx astro sync`, `npm run lint`, and `npm run build` before handing off changes that touch app code or config; GitHub Actions runs the same gate on `main` PRs.
- Keep `SUPABASE_URL` and `SUPABASE_KEY` server-only. Declare env access through @astro.config.mjs and store local Cloudflare secrets in `.dev.vars`, not committed files.
- Do not add protected pages without updating `PROTECTED_ROUTES` in @src/middleware.ts.

## Project Structure

- `src/pages/` contains Astro pages; auth routes are under `src/pages/auth/`.
- `src/components/` contains Astro and React UI; shadcn/ui components live in `src/components/ui/` per @components.json.
- `src/lib/` holds Supabase, config-status, and shared helpers; keep product logic there before wiring it into pages.
- `context/foundation/` contains durable product, stack, and deployment decisions; do not put change-scoped notes there.

## Development Workflow

- `npm run dev` starts the Astro dev server.
- `npm run build` creates the Cloudflare-targeted production build.
- `npm run preview` previews the built app.
- `npm run lint` runs type-aware ESLint; `npm run lint:fix` applies safe fixes.
- `npm run format` runs Prettier with Astro and Tailwind plugins.

## Coding Style & Conventions

Use the `@/*` import alias from @tsconfig.json for `src` imports. Prefer Astro components for static/layout work and React components only for client interactivity, as shown by auth forms in `src/components/auth/`. Merge conditional Tailwind classes with `cn()` from @src/lib/utils.ts. API handlers should use uppercase method exports and validate request data before calling Supabase.

## Testing & CI

No automated test runner is configured yet; do not invent `npm test`. For now, rely on lint, build, and manual auth-route smoke tests. CI deploys to Cloudflare Workers only on pushes to `main`; PRs validate without deploying.

## Commits & PRs

Recent history uses Conventional Commit-style prefixes (`feat:`, `docs:`, `chore:`). PRs should mention affected routes/components, list validation commands run, and call out Supabase schema, RLS, or secret changes explicitly.
