# CI/CD PR Code Review Workflow — Plan Brief

> Full plan: `context/changes/ci-cd-code-review/plan.md`
> Research: `context/changes/ci-cd-code-review/research.md`

## What & Why

Build the first AI-assisted PR code review workflow for the repo. The goal is to automatically review TypeScript changes in pull requests, publish actionable feedback, and mark PRs with pass/fail labels while keeping the main workflow readable through a local composite action.

## Starting Point

The repo already has CI/CD on `main` for Astro sync, lint, tests, build, and Cloudflare deploy. AI review files exist only as stubs: the workflow targets `master` and calls a placeholder external action, while the local action is incomplete and references nonexistent runtime code.

## Desired End State

PRs to `main` run an `AI Code Review` workflow that extracts TypeScript-only diffs and calls `packages/code-reviewer` through `./.github/actions/ai-review`. The workflow updates one sticky PR comment, maintains exactly one verdict label, and supports retry by adding `ai-cr:review`.

## Key Decisions Made

| Decision         | Choice                         | Why (1 sentence)                                                                   | Source          |
| ---------------- | ------------------------------ | ---------------------------------------------------------------------------------- | --------------- |
| Target branch    | `main`                         | Existing CI and remote default branch use `main`, not `master`.                    | Research / Plan |
| Event model      | `pull_request`                 | Simpler MVP for same-repo/private work without `pull_request_target` secret risks. | Research        |
| Diff scope       | TypeScript files only, no cap  | User wants all TS files reviewed for now and accepts cost/context risk.            | Plan            |
| PR body          | Exclude for MVP                | User chose to defer body handling and avoid extra prompt cost.                     | Plan            |
| Comment behavior | One sticky comment             | Keeps PR discussion clean across retries and updates.                              | Plan            |
| Labels           | Auto-create and sync           | Prevents first-run setup failure and contradictory pass/fail labels.               | Plan            |
| Verification     | Live OpenRouter smoke included | User has package/env setup and wants provider wiring proven.                       | Plan            |

## Scope

**In scope:**

- Replace `.github/workflows/review.yml` with a real workflow for PRs to `main`.
- Replace `.github/actions/ai-review/action.yml` with a working local composite action.
- Extend `packages/code-reviewer` to accept PR title plus TypeScript diff.
- Add sticky PR comment and `ai-cr:*` label lifecycle.
- Verify with package checks, root gates, live OpenRouter smoke, and PR smoke.

**Out of scope:**

- Fork-safe `pull_request_target` design.
- Non-TypeScript file review.
- Diff byte/line cap.
- PR body prompt usage.
- App deployment, Supabase, Cloudflare, UI, database, or eval framework changes.

## Architecture / Approach

The workflow orchestrates GitHub events, permissions, diff extraction, comments, and labels. The local composite action adapts workflow inputs into the reviewer package. `packages/code-reviewer` remains the pure AI review engine with structured output and no GitHub API side effects.

## Phases at a Glance

| Phase                                | What it delivers                                                    | Key risk                                                |
| ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------- |
| 1. Reviewer Package Contract         | PR-title-aware reviewer contract and live CLI smoke                 | Breaking existing diff-only CLI behavior                |
| 2. Composite Action                  | Working local action with inputs/outputs and OpenRouter env mapping | Runtime path/package resolution in Actions              |
| 3. GitHub Workflow Orchestration     | Real `pull_request` workflow on `main` with TS diff extraction      | Event gating loops or missing permissions               |
| 4. PR Comment and Label Side Effects | Sticky comment and self-healing label lifecycle                     | Duplicate comments or contradictory labels              |
| 5. End-to-End Verification           | Deterministic checks plus live OpenRouter and PR smoke              | Live provider/GitHub behavior differs from local checks |

**Prerequisites:** GitHub secret `OPENROUTER_API_KEY`; local package env for live smoke.
**Estimated effort:** ~2-3 sessions across 5 phases.

## Open Risks & Assumptions

- Uncapped TypeScript diffs can increase cost or fail provider context limits.
- `pull_request` may not support secrets for forked PRs; fork support is explicitly deferred.
- GitHub comment/label behavior requires a real PR smoke because local checks cannot fully prove it.

## Success Criteria (Summary)

- PRs to `main` get one AI review comment with verdict, five scores, and summary.
- PRs end with exactly one of `ai-cr:passed` or `ai-cr:failed`, and retry label cleanup works.
- Reviewer package checks, root validation, live OpenRouter smoke, and PR workflow smoke pass.
