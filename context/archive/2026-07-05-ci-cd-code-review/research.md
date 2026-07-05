---
date: 2026-07-05T12:12:07+02:00
researcher: Codex
git_commit: 9bd0349a60927ae919efa80f6b708253659d0a6c
branch: feat/ai-code-review
repository: garden-weed-planner
topic: "CI/CD PR code review workflow based on requirements"
tags: [research, codebase, github-actions, ai-code-review, ci-cd]
status: complete
last_updated: 2026-07-05
last_updated_by: Codex
---

# Research: CI/CD PR code review workflow based on requirements

**Date**: 2026-07-05T12:12:07+02:00
**Researcher**: Codex
**Git Commit**: 9bd0349a60927ae919efa80f6b708253659d0a6c
**Branch**: feat/ai-code-review
**Repository**: garden-weed-planner

## Research Question

Research the codebase for change `ci-cd-code-review`, based on `context/changes/ci-cd-code-review/requirements.md`: introduce the first CI/CD workflow for PR code reviews, with a GitHub Actions workflow, a composite action, PR title/body/diff inputs, scored review criteria, PR comment side effect, pass/fail labels, and on-demand retry when label `ai-cr:review` is added.

## Summary

The repo already has a production CI/CD workflow for app validation and Cloudflare Workers deploys, but the AI code review workflow/action are currently only untracked stubs and are not yet executable. The most important planning issue is a branch mismatch: durable repo CI and remote default branch use `main`, while the new requirements and draft `review.yml` say `master`.

Two viable implementation paths emerged:

1. **Recommended first path: local composite action on `pull_request` to `main`**. Keep the main workflow readable by calling `./.github/actions/ai-review`, pass PR title/body/diff and `OPENROUTER_API_KEY` as action inputs/env, then let separate workflow steps comment and manage labels using action outputs.
2. **Safer but more complex fork-capable path: `pull_request_target`**. This can access secrets for forked PRs, but must not checkout or execute untrusted PR head code. It should fetch metadata and diff through GitHub API only. This is a bigger security design and likely not the MVP path unless external fork PRs are required.

The existing `packages/code-reviewer` package is a strong base for the review engine: it already uses AI SDK `ToolLoopAgent`, OpenRouter, structured output, five 1-10 score criteria, `pass/fail`, and Markdown summary. However, it currently accepts only a raw diff, not PR title/body, and its CLI prints JSON to stdout rather than writing GitHub Action outputs.

## Detailed Findings

### Requirements and current change scope

- The requirements request a workflow for every new pull request to `master` and a composite action for the review itself ([context/changes/ci-cd-code-review/requirements.md:1-4](requirements.md#L1-L4)).
- Inputs are PR title, PR description with an explicit cost tradeoff question, and git diff ([context/changes/ci-cd-code-review/requirements.md:6-10](requirements.md#L6-L10)).
- Review criteria are intended to be 1-10 scores, but the actual criteria block is still a placeholder `{{CR_CRITERIA}}` ([context/changes/ci-cd-code-review/requirements.md:12-16](requirements.md#L12-L16)).
- Expected side effects are a PR comment and mutually exclusive labels `ai-cr:failed` or `ai-cr:passed` ([context/changes/ci-cd-code-review/requirements.md:23-27](requirements.md#L23-L27)).
- Expected retry behavior is adding label `ai-cr:review` ([context/changes/ci-cd-code-review/requirements.md:28-30](requirements.md#L28-L30)).

### Existing CI/CD baseline

- Existing CI runs on `push` and `pull_request` to `main`, not `master` ([.github/workflows/ci.yml:3-7](../../../.github/workflows/ci.yml#L3-L7)).
- CI uses `actions/setup-node@v4` with major `22`, while `.nvmrc` pins exact `22.14.0` ([.github/workflows/ci.yml:14-17](../../../.github/workflows/ci.yml#L14-L17), [.nvmrc:1](../../../.nvmrc#L1)). For exact parity, new workflows should use `node-version-file: .nvmrc` or `22.14.0`.
- Existing CI validation is `npm ci`, `npx astro sync`, `npm run lint`, `npm run test`, and `npm run build` ([.github/workflows/ci.yml:18-22](../../../.github/workflows/ci.yml#L18-L22)).
- Cloudflare deployment is gated to pushes to `main` only ([.github/workflows/ci.yml:26-38](../../../.github/workflows/ci.yml#L26-L38)).
- Deployment docs confirm PRs validate only and pushes to `main` deploy with Wrangler ([context/foundation/deploy-plan.md:5-13](../../foundation/deploy-plan.md#L5-L13)).
- Repo guidance requires the same handoff gate and says CI runs it on `main` PRs ([AGENTS.md:7-8](../../../AGENTS.md#L7-L8), [README.md:130-137](../../../README.md#L130-L137)).

### Draft AI review workflow stub

- `.github/workflows/review.yml` exists in the working tree but is untracked. It is a stub named `AI Code Review` ([.github/workflows/review.yml:1](../../../.github/workflows/review.yml#L1)).
- It currently triggers only on PRs to `master` ([.github/workflows/review.yml:3-5](../../../.github/workflows/review.yml#L3-L5)). This conflicts with the existing CI workflow and remote default branch, which are `main`.
- It checks out the repository and calls an external placeholder action `twoj-zespol/ai-reviewer@<sha>` with `LLM_PROVIDER_API_KEY` ([.github/workflows/review.yml:10-15](../../../.github/workflows/review.yml#L10-L15)). That does not satisfy the local composite action requirement.
- The workflow has no explicit `permissions`, so it is not yet prepared to write PR comments or labels.

### Local composite action stub

- `.github/actions/ai-review/action.yml` exists in the working tree but is untracked. It defines a composite action named `AI Reviewer` ([.github/actions/ai-review/action.yml:1-3](../../../.github/actions/ai-review/action.yml#L1-L3)).
- The action currently accepts only `api-key`; it is missing required inputs for PR title, PR description/body, and diff ([.github/actions/ai-review/action.yml:10-13](../../../.github/actions/ai-review/action.yml#L10-L13)).
- The action declares a `verdict` output from `steps.agent.outputs.verdict` ([.github/actions/ai-review/action.yml:16-19](../../../.github/actions/ai-review/action.yml#L16-L19)), but the current review CLI prints JSON to stdout and does not write `$GITHUB_OUTPUT` ([packages/code-reviewer/src/index.ts:41-44](../../../packages/code-reviewer/src/index.ts#L41-L44)).
- The composite action runs `node ${{ github.action_path }}/dist/review.js` ([.github/actions/ai-review/action.yml:25-28](../../../.github/actions/ai-review/action.yml#L25-L28)), but no such built file exists under `.github/actions/ai-review/` in the current tree.
- The action ignores its declared `api-key` input and tries to read `secrets.*` directly in the composite action env ([.github/actions/ai-review/action.yml:29-32](../../../.github/actions/ai-review/action.yml#L29-L32)). Prefer passing the secret from the workflow as an input and mapping it to `OPENROUTER_API_KEY` inside the action.

### Existing reviewer package

- `packages/code-reviewer` is a separate package with `dev`, `typecheck`, and `build` scripts ([packages/code-reviewer/package.json:1-9](../../../packages/code-reviewer/package.json#L1-L9)). It is not wired into the root `package.json` scripts or workspaces, so the workflow/action must intentionally install/build it or bundle action code another way.
- The package depends on `@openrouter/ai-sdk-provider`, `ai`, `dotenv`, and `zod` ([packages/code-reviewer/package.json:15-24](../../../packages/code-reviewer/package.json#L15-L24)).
- Its env example standardizes on `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` ([packages/code-reviewer/.env.example:1-2](../../../packages/code-reviewer/.env.example#L1-L2)).
- The provider actually reads `OPENROUTER_API_KEY` and throws if required and missing ([packages/code-reviewer/src/providers/openrouter.ts:12-17](../../../packages/code-reviewer/src/providers/openrouter.ts#L12-L17)). The draft workflow/action references `LLM_PROVIDER_API_KEY`, so secrets naming needs alignment.
- The default model is `openrouter/auto`, with override via `OPENROUTER_MODEL` ([packages/code-reviewer/src/providers/openrouter.ts:4](../../../packages/code-reviewer/src/providers/openrouter.ts#L4), [packages/code-reviewer/src/providers/openrouter.ts:20-28](../../../packages/code-reviewer/src/providers/openrouter.ts#L20-L28)).
- The reviewer agent uses AI SDK `ToolLoopAgent` with structured object output based on `ReviewSchema` ([packages/code-reviewer/src/agents/reviewer.ts:1-6](../../../packages/code-reviewer/src/agents/reviewer.ts#L1-L6), [packages/code-reviewer/src/agents/reviewer.ts:16-24](../../../packages/code-reviewer/src/agents/reviewer.ts#L16-L24)).
- The current prompt asks for five criteria: implementation correctness, idiomaticity, complexity, risk-based test coverage, and security ([packages/code-reviewer/src/prompts/code-review.ts:1-5](../../../packages/code-reviewer/src/prompts/code-review.ts#L1-L5)). This is a concrete candidate to replace `{{CR_CRITERIA}}` in requirements/planning.
- The schema returns five numeric scores, `verdict`, and Markdown `summary` ([packages/code-reviewer/src/schemas/review.ts:3-15](../../../packages/code-reviewer/src/schemas/review.ts#L3-L15)).
- The public helper and CLI accept only `diff`; PR title/body are not yet part of the package contract ([packages/code-reviewer/src/index.ts:20-30](../../../packages/code-reviewer/src/index.ts#L20-L30), [packages/code-reviewer/src/prompts/code-review.ts:7-8](../../../packages/code-reviewer/src/prompts/code-review.ts#L7-L8)).

### Permissions, events, comments, and labels

- To satisfy PR comments and labels, the workflow should declare at least `contents: read`, `pull-requests: write`, and `issues: write`. Labels and PR comments use the issues surface for GitHub pull requests.
- For `pull_request` on same-repo PRs, secrets are available for normal internal use, but fork PR secret behavior is constrained. This is simpler and likely enough for a solo/private repo.
- For fork-capable secret use, `pull_request_target` can be used only if the job avoids checking out or executing PR head code. It should fetch PR metadata and diff through GitHub APIs. Otherwise it creates a secret-exfiltration risk.
- Label retry should include `pull_request` event type `labeled` and gate reruns with a condition like `github.event.action != 'labeled' || github.event.label.name == 'ai-cr:review'`. Without that guard, adding `ai-cr:passed` or `ai-cr:failed` can retrigger the review loop.
- The implementation should remove the opposite verdict label before adding the new one, and probably remove `ai-cr:review` after a retry completes to avoid stale retry intent.
- No local `.github/labels.yml` or label-management config was found. The workflow can either create labels if missing, or document one-time setup for `ai-cr:failed`, `ai-cr:passed`, and `ai-cr:review`.

### Local validation and hooks

- Root scripts include the main app gates, plus related staged tests and Playwright E2E ([package.json:5-18](../../../package.json#L5-L18)).
- Current pre-commit runs `npx lint-staged` and `npm run test:related:staged` ([.husky/pre-commit:1-2](../../../.husky/pre-commit#L1-L2)).
- Current pre-push runs `npm run test:pre-push` ([.husky/pre-push:1](../../../.husky/pre-push#L1)).
- `test-related-staged` only considers staged `src/**/*.{ts,tsx}` and skips otherwise ([scripts/test-related-staged.mjs:14-18](../../../scripts/test-related-staged.mjs#L14-L18)). Workflow/action YAML changes are therefore not meaningfully exercised by local hooks beyond any manual validation.

## Code References

- `context/changes/ci-cd-code-review/requirements.md:1-30` — requirements for PR review workflow/action, inputs, side effects, and retry label.
- `.github/workflows/ci.yml:3-38` — existing CI/CD flow on `main` with validation and deploy.
- `.github/workflows/review.yml:1-15` — current untracked AI review workflow stub.
- `.github/actions/ai-review/action.yml:1-32` — current untracked local composite action stub.
- `packages/code-reviewer/src/index.ts:20-44` — reviewer helper and CLI currently accept only diff and print JSON.
- `packages/code-reviewer/src/prompts/code-review.ts:1-8` — current Polish review criteria and diff-only prompt.
- `packages/code-reviewer/src/schemas/review.ts:3-15` — structured review output schema.
- `packages/code-reviewer/src/providers/openrouter.ts:12-28` — OpenRouter API key/model resolution.
- `packages/code-reviewer/src/agents/reviewer.ts:16-24` — ToolLoopAgent construction with structured output.
- `context/foundation/deploy-plan.md:5-13` — PR validation and push-to-main deploy policy.
- `context/foundation/test-plan.md:110-120` — current required quality gates.
- `context/foundation/test-plan.md:166-176` — local/CI gate boundaries and constraints.

## Architecture Insights

- The repo already separates **main workflow orchestration** from **review engine logic**: `.github/workflows/review.yml` should stay short, `.github/actions/ai-review` should encapsulate review execution, and `packages/code-reviewer` should own AI prompt/schema/provider code.
- The cleanest action contract is: inputs in, structured outputs out. Inputs should include `pr-title`, `pr-body`, `diff`, and `api-key`; outputs should include at least `verdict`, `summary`, and optionally full JSON for comment rendering.
- The package should not read GitHub context directly. Keeping it as a pure `reviewPullRequest({ title, body, diff })` / CLI tool makes it testable locally and reusable outside GitHub Actions.
- GitHub side effects should likely stay in workflow steps or a small action wrapper, not inside the core reviewer package. Commenting/labeling needs `GITHUB_TOKEN` and GitHub API semantics; review generation needs LLM inputs and provider env.
- Requirements mention PR description cost tradeoff. A practical MVP can pass the body when available but keep diff as the primary signal to reduce token use; a later iteration can summarize/truncate long descriptions and diffs.
- Existing product rules about Supabase secrets still apply: do not pass `SUPABASE_URL` or `SUPABASE_KEY` into AI review unless explicitly needed. This workflow should need only `GITHUB_TOKEN` and `OPENROUTER_API_KEY`.

## Historical Context (from prior changes)

- The deployment foundation says PRs validate only and pushes to `main` deploy with Wrangler, so this change should not alter app deploy semantics ([context/foundation/deploy-plan.md:5-13](../../foundation/deploy-plan.md#L5-L13)).
- The test plan defines the required handoff/CI gates as Astro sync, lint, test, and build, with E2E still local-only unless intentionally promoted ([context/foundation/test-plan.md:110-120](../../foundation/test-plan.md#L110-L120), [context/foundation/test-plan.md:166-176](../../foundation/test-plan.md#L166-L176)).
- Infrastructure research chose Cloudflare Workers and noted secrets can drift across `.env`, `.dev.vars`, GitHub Secrets, and Workers secrets unless ownership is explicit ([context/foundation/infrastructure.md:46-58](../../foundation/infrastructure.md#L46-L58)). The same warning applies to `OPENROUTER_API_KEY` vs `LLM_PROVIDER_API_KEY`.
- Prior development-gates research found the canonical CI handoff sequence already existed and should remain the boundary unless deliberately changed ([context/archive/2026-06-11-introduce-development-gates/research.md:162-174](../../archive/2026-06-11-introduce-development-gates/research.md#L162-L174)).
- Prior `tool-loop-agent` planning for `packages/code-reviewer` intentionally preserved OpenRouter env names and avoided CI/eval expansion, provider switching, promptfoo, or AI SDK upgrades. That suggests this change should wire the existing reviewer into CI rather than redesigning the reviewer stack.

## Related Research

- `context/archive/2026-06-11-introduce-development-gates/research.md` — prior research on CI/local quality gates and why current gates should remain bounded.
- `context/foundation/test-plan.md` — current quality-gate cookbook and local/CI testing boundary.
- `context/foundation/deploy-plan.md` — current GitHub Actions deployment flow.
- `context/foundation/infrastructure.md` — Cloudflare Workers and secrets-drift risks.
- `context/changes/tool-loop-agent/plan.md` — existing `packages/code-reviewer` refactor/contract history.

## Open Questions

1. Should the new workflow target `main` to match the repository default and existing CI, or `master` exactly as written in requirements? Research strongly recommends `main`.
2. Should the first implementation support forked PRs? If yes, use `pull_request_target` carefully and avoid executing PR code. If no, `pull_request` is simpler.
3. Should `{{CR_CRITERIA}}` be replaced by the existing five package criteria, or does the team want a different rubric before implementation?
4. Should missing labels be created automatically by workflow, or should labels be a documented one-time repository setup?
5. How should large diffs be bounded for cost and context-window control: max changed files, max bytes, truncation with warning, or fail-open/fail-closed behavior?
