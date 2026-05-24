---
project: garden-weed-planner
researched_at: 2026-05-24
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 + React 19
  runtime: Cloudflare Workers
---

## Recommendation

**Deploy on Cloudflare Workers.**

Cloudflare Workers is the best MVP fit because the current repo already targets it through `@astrojs/cloudflare`, `wrangler.jsonc`, Node 22, Astro SSR, and GitHub Actions. The interview constraints also favor it: request/response only, low QPS, single EU-region product expectations, external Supabase services acceptable, and Cloudflare familiarity acceptable.

Primary sources checked on 2026-05-24: Cloudflare Workers pricing and Wrangler deployment docs, Astro Cloudflare adapter docs, Vercel CLI/MCP/pricing docs, Netlify pricing/MCP docs, Railway pricing/CLI docs, Render CLI/rollback/MCP docs.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total | Notes |
|---|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5/5 | Existing target; `wrangler deploy`, `wrangler deployments list`, `wrangler rollback`, Workers logs, Cloudflare `llms.txt`/Markdown docs, Workers observability MCP. |
| Vercel | Pass | Pass | Pass | Pass | Pass (Beta) | 4.5/5 | Excellent CLI, rollback, logs, `llms-full.txt`, and official Vercel MCP beta; requires adapter/config shift from Cloudflare. |
| Netlify | Pass | Pass | Pass | Pass | Pass | 4.5/5 | Good frontend DX, deploy previews, CLI, pricing docs, `llms.txt`, official MCP; requires adapter/config shift. |
| Railway | Pass | Pass | Pass | Partial | Partial | 3.5/5 | Strong full-stack PaaS and CLI logs; rollback is more dashboard-oriented, and container hosting is unnecessary for this edge-first Astro app. |
| Render | Pass | Pass | Partial | Pass | Pass | 3.5/5 | Good API/CLI/logs/rollback and official MCP; better for web services than this already-configured Workers app. |
| Fly.io | Pass | Partial | Pass | Pass | Partial | 3.5/5 | Excellent for persistent processes and Docker-style control; too much operational surface for a small Astro/Supabase MVP. |

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

It matches the selected stack and avoids re-platforming. Astro 6’s Cloudflare adapter now uses the Workers runtime locally, and the project already has `wrangler.jsonc` pointing at `@astrojs/cloudflare/entrypoints/server`.

#### 2. Vercel

Vercel has excellent agent-facing docs, CLI operations, rollback, preview deployments, and official MCP in beta. It loses because the app is not currently configured for Vercel and the existing deployment target is first-class Cloudflare.

#### 3. Netlify

Netlify is a strong Astro/frontend deployment option with CLI, previews, pricing docs, and official MCP. It loses to Cloudflare for the same reason: switching would add adapter and deployment-path work without solving a current problem.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. Astro 6 on Cloudflare runs against `workerd`; Node-only APIs or incompatible packages can fail at runtime.
2. Secrets can drift across `.env`, `.dev.vars`, GitHub Secrets, and Workers secrets unless ownership is explicit.
3. Supabase remains regional while Workers are edge-distributed; EU data locality depends on the Supabase project region.
4. Preview deployments can accidentally use production Supabase credentials if environments are not separated.
5. Cloudflare-specific adapter, bindings, and `wrangler.jsonc` create some migration cost if the app moves later.

### Pre-Mortem — How This Could Fail

Six months after launch, the Cloudflare decision looks bad because the team assumed edge deployment removed operational discipline. Preview builds use the same Supabase project as production, so an agent-generated PR writes test data into real user tables. A later dependency introduces a Node-only API that passes a superficial build but fails under `workerd`. Runtime logs exist, but no standard `wrangler` or dashboard routine was documented, so debugging production errors takes too long. Rollback restores Worker code quickly, but it cannot reverse Supabase migrations or RLS-policy mistakes. The platform was not the core failure; the failure was treating Cloudflare’s good DX as a substitute for environment separation, runtime compatibility checks, and database-change discipline.

### Unknown Unknowns

- Astro 6 with `@astrojs/cloudflare` uses the real Workers runtime in dev/preview, not plain Node.
- Worker rollback does not roll back Supabase schema, data, or RLS policies.
- Workers pricing is generous for low traffic, but CPU time, logs, KV/R2/D1, or paid-plan features can matter later.
- EU users do not guarantee EU data residency unless Supabase is created in an EU region.
- Cloudflare MCP and API access require careful token scoping before an agent can operate safely.

## Operational Story

- **Preview deploys**: Use GitHub PR/branch deployments through Cloudflare Workers/Pages integration or explicit staging deploys with `wrangler deploy --env staging`; protect previews if they expose user data or production-like secrets.
- **Secrets**: Keep local Node/Supabase values in `.env`, local Cloudflare runtime values in `.dev.vars`, CI values in GitHub Secrets, and production runtime secrets in Cloudflare Workers secrets; rotate by updating GitHub/Cloudflare first, then redeploy.
- **Rollback**: Use `npx wrangler deployments list` to find recent Worker versions and `npx wrangler rollback --message "<reason>"` to restore the previous version; database migrations and Supabase policy changes need separate rollback plans.
- **Approval**: Agents may run read-only log/status checks and create preview deployments; production deploys, secret rotation, schema migrations, and RLS policy changes require human approval.
- **Logs**: Use `npx wrangler tail` for live runtime logs, GitHub Actions logs for pipeline failures, and Cloudflare Workers observability for retained logs/metrics.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Node-only dependency breaks under `workerd` | Devil's advocate / Unknown unknowns | M | M | Run `npm run build` and `npm run dev` on Node 22 before deploy; reject packages that require unsupported Node APIs. |
| Preview deploy writes to production Supabase | Devil's advocate / Pre-mortem | M | H | Create separate Supabase project or schema for staging; never put production Supabase secrets in preview environments. |
| Worker rollback does not undo DB changes | Pre-mortem / Unknown unknowns | M | H | Require human approval and reversible migration notes for schema/RLS changes. |
| Secret drift across `.env`, `.dev.vars`, GitHub, and Cloudflare | Devil's advocate | M | M | Maintain one environment checklist in implementation docs; rotate secrets in platform stores before redeploying. |
| Supabase region mismatch for EU users | Unknown unknowns | L | M | Create Supabase project in an EU region before production data exists. |
| Platform lock-in to Cloudflare adapter/config | Devil's advocate | L | M | Keep business logic in `src/lib/` and avoid unnecessary Workers-only APIs until a real need appears. |

## Getting Started

1. Confirm Node `22.14.0`, then run `npm ci`, `npx astro sync`, `npm run lint`, and `npm run build`.
2. Authenticate Wrangler with the Cloudflare account: `npx wrangler login`.
3. Set production secrets in Cloudflare Workers: `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`.
4. Deploy the current Astro 6 Workers build with `npx wrangler deploy`.
5. Verify the deployment URL, then check runtime logs with `npx wrangler tail`.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)

