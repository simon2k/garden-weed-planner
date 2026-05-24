---
bootstrapped_at: 2026-05-24T18:21:34+02:00
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: garden-weed-planner
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

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


## Pre-scaffold verification

| Signal | Value | Severity | Notes |
| --- | --- | --- | --- |
| npm package | not run | n/a | Starter command uses `git clone`, so no npm create package was derived. |
| GitHub repo | not run | unavailable | `gh api repos/przeprogramowani/10x-astro-starter --jq '.pushed_at'` returned HTTP 401 Bad credentials. |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`  
**Strategy**: git-clone  
**Exit code**: 0  
**Files moved**: 31457  
**Conflicts (.scaffold siblings)**: none  
**.gitignore handling**: moved silently  
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: npm audit --json  
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW  
**Direct vs transitive**: 0/0/2/0 direct of total 0/1/9/0

#### CRITICAL findings

None.

#### HIGH findings

- **devalue** (transitive, range `5.6.3 - 5.8.0`) — Svelte devalue: DoS via sparse array deserialization. Advisory: https://github.com/advisories/GHSA-77vg-94rm-hx3p. Fix: available.

#### MODERATE findings

- **@astrojs/check** (direct, range `>=0.9.3`) — dependency chain. Advisory: n/a. Fix: @astrojs/check@0.9.2 (semver-major).
- **@astrojs/language-server** (transitive, range `>=2.14.0`) — dependency chain. Advisory: n/a. Fix: @astrojs/check@0.9.2 (semver-major).
- **@cloudflare/vite-plugin** (transitive, range `<=0.0.0-fff677e35 || 0.0.7 - 1.37.2`) — dependency chain. Advisory: n/a. Fix: available.
- **miniflare** (transitive, range `<=0.0.0-fff677e35 || 3.20250204.0 - 4.20260518.0`) — dependency chain. Advisory: n/a. Fix: available.
- **volar-service-yaml** (transitive, range `<=0.0.70`) — dependency chain. Advisory: n/a. Fix: @astrojs/check@0.9.2 (semver-major).
- **wrangler** (direct, range `<=0.0.0-kickoff-demo || 3.108.0 - 4.93.0`) — dependency chain. Advisory: n/a. Fix: available.
- **ws** (transitive, range `8.0.0 - 8.20.0`) — ws: Uninitialized memory disclosure. Advisory: https://github.com/advisories/GHSA-58qx-3vcg-4xpx. Fix: available.
- **yaml** (transitive, range `2.0.0 - 2.8.2`) — yaml is vulnerable to Stack Overflow via deeply nested YAML collections. Advisory: https://github.com/advisories/GHSA-48c2-rrv3-qjmp. Fix: @astrojs/check@0.9.2 (semver-major).
- **yaml-language-server** (transitive, range `1.11.1-08d5f7b.0 - 1.21.1-f1f5a94.0 || 1.22.1-0ae5603.0 - 1.22.1-fc5f874.0`) — dependency chain. Advisory: n/a. Fix: @astrojs/check@0.9.2 (semver-major).

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint | Value |
| --- | --- |
| bootstrapper_confidence | first-class |
| quality_override | false |
| path_taken | standard |
| self_check_answers | null |
| team_size | solo |
| deployment_target | cloudflare-pages |
| ci_provider | github-actions |
| ci_default_flow | auto-deploy-on-merge |
| has_auth | true |
| has_payments | false |
| has_realtime | false |
| has_ai | false |
| has_background_jobs | false |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
