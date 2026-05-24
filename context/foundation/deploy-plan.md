# Deployment Plan — Cloudflare Workers CI/CD

## Summary

The project deploys to Cloudflare Workers using GitHub Actions. Pull requests run validation only; pushes to `main` validate and then deploy with Wrangler.

## Deployment Flow

- Runtime target: Cloudflare Workers via `@astrojs/cloudflare` and `wrangler.jsonc`.
- Worker name: `garden-weed-planner`.
- CI validation: `npm ci`, `npx astro sync`, `npm run lint`, `npm run build`.
- Production deploy: `cloudflare/wrangler-action@v3` runs `wrangler deploy` only on `push` to `main`.
- PR previews are intentionally disabled for now to avoid accidental access to production Supabase credentials.

## Required GitHub Secrets

Configure these repository secrets before relying on production deployment:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_KEY`

The Cloudflare API token should be scoped to the target account and allow Worker deployment.

## Verification

Before handoff or merge, run:

```bash
npx astro sync
npm run lint
npm run build
npx wrangler deploy --dry-run
```

After merge to `main`, verify the GitHub Actions run succeeds, open the deployed Worker URL, smoke test `/`, `/signin`, `/signup`, and protected-route redirects, then use `npx wrangler tail` if runtime logs are needed.

## Notes

- Cloudflare Worker rollback restores Worker code only; it does not roll back Supabase data, schema, or RLS changes.
- Local secrets stay in `.env` or `.dev.vars`; production deployment secrets live in GitHub repository secrets for this CI-owned setup.
- The current build warning about missing Astro `site` affects sitemap generation only and does not block deployment.
