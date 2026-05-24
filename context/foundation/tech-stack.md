---
starter_id: 10x-astro-starter
package_manager: npm
project_name: garden-weed-planner
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Garden Weed Planner is a small after-hours web-app MVP with a 3-week timeline, required login, per-user data isolation, CRUD-heavy garden records, and priority/date business logic. The 10x Astro Starter is the recommended JavaScript/TypeScript default for this product type because it provides Astro, React, TypeScript, Tailwind, Supabase auth/database, and Cloudflare deployment in one opinionated path. Supabase fits the authenticated, user-scoped PostgreSQL data model, while TypeScript helps keep the priority calculation and form contracts explicit. Cloudflare Pages, GitHub Actions, and auto-deploy-on-merge keep the first production path simple for a solo builder.
