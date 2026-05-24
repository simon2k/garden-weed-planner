# Repository Guidelines

This is an Astro 6 SSR app using React 19 islands, TypeScript, Tailwind 4, Supabase Auth, shadcn/ui, and the Cloudflare Workers adapter. Treat @CLAUDE.md as the detailed AI-agent source of truth; this file is the short onboarding map.

## Critical Rules & Commands

- Use Node `22.14.0` from @.nvmrc and install with `npm ci` when reproducing CI.
- Run `npm run lint` and `npm run build` before handing off; CI runs `npx astro sync`, then those two commands on `main` pushes and PRs.
- Keep secrets out of client code: `SUPABASE_URL` and `SUPABASE_KEY` are declared as server-only Astro env fields in @astro.config.mjs. Local Cloudflare secrets belong in `.dev.vars`; Node/Supabase local values belong in `.env`.
- API routes must be server-rendered and use uppercase handler exports such as `GET`/`POST`; auth examples live in @src/pages/api/auth/.

## Project Structure

- `src/pages/` contains Astro pages and API endpoints; protected-route behavior is centralized in @src/middleware.ts.
- `src/components/` holds Astro and React UI, with shadcn/ui components in `src/components/ui/`.
- `src/lib/` contains Supabase setup, config checks, and shared helpers such as `cn()`.
- `src/styles/global.css` is the Tailwind entry referenced by @components.json.
- `context/foundation/` stores product and stack decisions; read @context/foundation/tech-stack.md before changing architecture.

## Coding Style & Conventions

- Prefer Astro components for static content and React components only for interactive islands.
- Import project files via the `@/*` alias from @tsconfig.json.
- Merge conditional Tailwind classes with `cn()` from `@/lib/utils`; do not manually concatenate class strings.
- Formatting is Prettier with 2 spaces, semicolons, double quotes, 120 columns, Astro and Tailwind plugins; see @.prettierrc.json.
- ESLint enforces strict type-checked TypeScript, React Hooks, React Compiler, Astro a11y recommendations, `astro/no-set-html-directive`, and no unused variables except names prefixed with `_`; see @eslint.config.js.

## UI, Auth, and Data

- Add shadcn/ui pieces with `npx shadcn@latest add [name]`; the configured style is `new-york`, TSX, lucide icons.
- Route protection is opt-in through `PROTECTED_ROUTES` in @src/middleware.ts.
- Supabase currently uses Auth only; @README.md notes no database tables or migrations are required.

## Testing, Commits, and PRs

- No test runner is configured in @package.json; do not invent `npm test`. Use lint and build as the verification gate until tests are added.
- Recent history uses Conventional Commit-style subjects (`feat: ...`) plus an initial `Init ...`; keep new commits in that style.
- PRs target `main` and must pass the GitHub Actions workflow in @.github/workflows/ci.yml.
