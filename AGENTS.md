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

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 3

Review AI-generated code before merge with the **implementation review chain**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` is the lesson focus. Review is a quality gate, not an instruction to fix every finding.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Code review (lesson focus)** | |
| `/10x-impl-review <change-id>` | You have implemented code and want a structured review before merge. The skill checks plan adherence, scope discipline, safety and quality, architecture, pattern consistency, and success criteria, then presents findings for triage. |
| **Recurring lesson outcome** | |
| `/10x-lesson` | A finding reveals a recurring project rule or agent failure pattern. Record it in `context/foundation/lessons.md` instead of treating it as a one-off note. |

### Triage discipline

- Severity says how bad the finding is. Impact says how much the decision matters now.
- Valid outcomes: fix now, fix differently, skip, accept as risk, record as recurring rule (`/10x-lesson`), disagree.
- Fix critical findings. Do not burn hours on low-impact observations just because the agent found them.
- Conscious skipping of low-impact findings is a valid review outcome, not negligence.
- If you disagree with a finding, record why. Wrong agent reasoning is also signal.

### Review boundaries

- This lesson reviews implemented code. It does not create the plan, execute new phases, or teach CI review.
- Testing strategy and quality gates are introduced in Module 3.
- Do not use `/10x-contract` as a triage outcome in this lesson.

### Paths used by this lesson

- `context/changes/<change-id>/plan.md` - expected implementation contract
- `context/changes/<change-id>/reviews/` - review output
- `context/foundation/lessons.md` - recurring lessons

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
