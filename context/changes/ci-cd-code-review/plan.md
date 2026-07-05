# CI/CD PR Code Review Workflow Implementation Plan

## Overview

Implement the first AI-assisted PR code review workflow for this repository. The workflow will run on pull requests to `main`, review TypeScript diffs through the existing `packages/code-reviewer` engine, publish one sticky PR comment, and keep `ai-cr:passed` / `ai-cr:failed` labels in sync, with on-demand retry via `ai-cr:review`.

## Current State Analysis

The repository already has a CI/CD workflow for app validation and Cloudflare Workers deployment, but the AI review workflow is currently only a stub. The existing reviewer package is usable as the review engine, but its public contract is diff-only and its CLI only prints JSON to stdout. The local composite action and workflow also need to be replaced: they target `master`, call a placeholder external action, do not pass PR metadata/diff, and do not implement commenting or label side effects.

## Desired End State

A pull request to `main` triggers `AI Code Review` on `opened`, `synchronize`, and `reopened`. Adding `ai-cr:review` triggers a retry. The workflow extracts TypeScript-only changes, calls the local composite action with PR title and TypeScript diff, performs a live OpenRouter-backed review, updates one sticky PR comment, ensures required labels exist, removes stale verdict labels, adds the current verdict label, and removes the retry label after completion.

### Key Discoveries:

- Existing CI targets `main`, while the draft review workflow targets `master` (`.github/workflows/ci.yml:3-7`, `.github/workflows/review.yml:3-5`).
- The draft workflow calls `twoj-zespol/ai-reviewer@<sha>` instead of the local composite action (`.github/workflows/review.yml:10-15`).
- The local composite action accepts only `api-key`, ignores it, references `secrets.*`, and runs a nonexistent `dist/review.js` (`.github/actions/ai-review/action.yml:10-32`).
- The reviewer package already provides structured review output with five 1-10 scores, `verdict`, and `summary` (`packages/code-reviewer/src/schemas/review.ts:3-15`).
- The reviewer currently accepts only `diff`; PR title/body are not yet part of the package contract (`packages/code-reviewer/src/index.ts:20-30`, `packages/code-reviewer/src/prompts/code-review.ts:7-8`).
- `OPENROUTER_API_KEY` is the actual provider secret name used by the package (`packages/code-reviewer/src/providers/openrouter.ts:12-17`).

## What We're NOT Doing

- No fork-safe `pull_request_target` support in this change.
- No review of non-TypeScript files in this first workflow.
- No explicit diff size cap yet; large TypeScript diffs are accepted for now.
- No PR body/description prompt usage yet; title and TypeScript diff are sufficient for MVP.
- No changes to app deployment, Cloudflare Workers deploy behavior, Supabase secrets, or production CI gates.
- No promptfoo/eval setup, AI SDK upgrade, provider switch, or reviewer rubric redesign.
- No database, app UI, route, or Supabase changes.

## Implementation Approach

Build on the existing `packages/code-reviewer` package instead of creating a second reviewer. Keep the core package focused on review generation and structured output. Keep the composite action focused on adapting GitHub Action inputs to the reviewer package. Keep PR comments and label mutations in workflow-owned scripts/steps so GitHub side effects stay visible in `.github/workflows/review.yml` rather than hidden inside the review engine.

## Critical Implementation Details

### Security model

Use `pull_request`, not `pull_request_target`, and pass only `OPENROUTER_API_KEY` to the review job. Do not pass `SUPABASE_URL`, `SUPABASE_KEY`, Cloudflare secrets, or `.dev.vars` content to this workflow.

### Event lifecycle

Include the `labeled` pull request event only for retry. Gate the job so normal PR events run, but `labeled` runs only when the added label is `ai-cr:review`; otherwise adding `ai-cr:passed` or `ai-cr:failed` can cause a review loop.

### Diff scope

Filter the PR diff to TypeScript source files only. Do not add a byte/line cap in this change, but surface model failures clearly in the workflow and PR comment if the provider rejects an oversized prompt.

## Phase 1: Reviewer Package Contract

### Overview

Make `packages/code-reviewer` accept PR-oriented input while preserving the existing structured output and diff-first behavior.

### Changes Required:

#### 1. Review input contract

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Add a PR-oriented review helper without breaking the existing `reviewCodeDiff(diff)` entrypoint. This lets the composite action pass title plus TypeScript diff while preserving compatibility for direct diff review.

**Contract**: Export a new input type containing `title: string` and `diff: string`, plus an async helper such as `reviewPullRequest(input, options?)` returning `Promise<CodeReview>`. `reviewCodeDiff(diff, options?)` should remain available and can delegate to the PR helper with an empty or generic title.

#### 2. Prompt contract

**File**: `packages/code-reviewer/src/prompts/code-review.ts`

**Intent**: Include the PR title in the prompt and keep the diff as the primary evidence. PR body remains intentionally out of scope for this plan.

**Contract**: Add or update a prompt factory that accepts `{ title, diff }`. The prompt must make clear that the diff is TypeScript-only, and the reviewer should not infer behavior from files absent from the diff.

#### 3. CLI behavior

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Preserve direct CLI usage for live smoke testing and local debugging.

**Contract**: Direct execution still reads diff from stdin and prints JSON. Add an optional title source if practical, such as `--title` or `PR_TITLE`, but do not require it for backwards-compatible stdin diff review.

### Success Criteria:

#### Automated Verification:

- Code reviewer typecheck passes: `cd packages/code-reviewer && npm run typecheck`
- Code reviewer build passes: `cd packages/code-reviewer && npm run build`
- Existing direct CLI still returns valid JSON for a small TypeScript diff when `OPENROUTER_API_KEY` is configured.

#### Manual Verification:

- Inspect generated prompt behavior and confirm PR title is included while PR body remains excluded.
- Confirm the five existing score fields, `verdict`, and `summary` remain in the output contract.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Composite Action

### Overview

Replace the local composite action stub with a working adapter around `packages/code-reviewer`.

### Changes Required:

#### 1. Action metadata and inputs

**File**: `.github/actions/ai-review/action.yml`

**Intent**: Define the local action contract used by the workflow.

**Contract**: Inputs must include `api-key`, `pr-title`, and `diff`. Outputs must include `verdict`, `summary`, and a full JSON review payload suitable for comment rendering. The composite action must map `api-key` to `OPENROUTER_API_KEY`; it must not reference `secrets.*` directly.

#### 2. Action runner script

**File**: `.github/actions/ai-review/review.mjs`

**Intent**: Run the built reviewer package, pass action inputs into it, and write GitHub Action outputs.

**Contract**: The script reads action-provided environment variables or input files, calls the reviewer package, writes multiline-safe outputs to `$GITHUB_OUTPUT`, and exits non-zero only when review generation itself fails. It should not call GitHub APIs for comments or labels.

#### 3. Package resolution for action execution

**File**: `.github/actions/ai-review/action.yml`

**Intent**: Ensure the action can execute the reviewer code in CI without relying on nonexistent action-local `dist/review.js`.

**Contract**: The composite action either runs the package source with the package's existing tooling after dependencies are installed, or runs the package's built `dist` artifact after the workflow builds it. The chosen path must be explicit in the action steps and compatible with Node from `.nvmrc`.

### Success Criteria:

#### Automated Verification:

- Composite action metadata is syntactically valid YAML.
- Action no longer references `secrets.*` directly.
- Action no longer references nonexistent `.github/actions/ai-review/dist/review.js`.
- Code reviewer typecheck/build still pass after action integration.

#### Manual Verification:

- Inspect the action contract and confirm it exposes `verdict`, `summary`, and full JSON outputs.
- Confirm the action contains no PR comment or label mutation logic.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: GitHub Workflow Orchestration

### Overview

Replace the draft review workflow with a real `pull_request` workflow targeting `main` and calling the local composite action.

### Changes Required:

#### 1. Workflow triggers and permissions

**File**: `.github/workflows/review.yml`

**Intent**: Run review on normal PR updates and on explicit retry label, with enough permissions for side effects.

**Contract**: Trigger on `pull_request` to `main` for `opened`, `synchronize`, `reopened`, and `labeled`. Add job-level or workflow-level permissions: `contents: read`, `pull-requests: write`, and `issues: write`. Gate `labeled` runs so only `ai-cr:review` starts a review.

#### 2. Node and checkout setup

**File**: `.github/workflows/review.yml`

**Intent**: Match repository runtime conventions and provide the reviewer package dependencies.

**Contract**: Use `actions/checkout@v4` and `actions/setup-node@v4` with `node-version-file: .nvmrc` or exact `22.14.0`. Install dependencies needed by `packages/code-reviewer` in a deterministic way before invoking the local action.

#### 3. TypeScript-only diff collection

**File**: `.github/workflows/review.yml`

**Intent**: Generate the review input according to the chosen MVP scope: TypeScript files only, no cap.

**Contract**: The workflow must produce a diff containing only relevant TypeScript file changes, such as `.ts` and `.tsx`. If no TypeScript diff exists, the workflow should skip the model call and publish a clear neutral sticky comment or mark the review as passed by policy, without failing the PR.

#### 4. Local action invocation

**File**: `.github/workflows/review.yml`

**Intent**: Connect GitHub PR metadata and diff extraction to the composite action.

**Contract**: Call `./.github/actions/ai-review` with `api-key: ${{ secrets.OPENROUTER_API_KEY }}`, `pr-title` from the pull request title, and the TypeScript diff. Do not use `LLM_PROVIDER_API_KEY` unless a separate provider abstraction is introduced later.

### Success Criteria:

#### Automated Verification:

- Workflow YAML is syntactically valid.
- Workflow targets `main`, not `master`.
- Workflow uses the local action path, not the placeholder external action.
- Workflow declares required write permissions for comments and labels.

#### Manual Verification:

- Inspect event gating and confirm adding `ai-cr:passed` or `ai-cr:failed` cannot retrigger review.
- Confirm no Supabase or Cloudflare secrets are referenced by the review workflow.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: PR Comment and Label Side Effects

### Overview

Implement visible PR side effects: one sticky review comment and mutually exclusive AI review labels.

### Changes Required:

#### 1. Sticky comment script or workflow step

**File**: `.github/workflows/review.yml` or `.github/scripts/upsert-ai-review-comment.mjs`

**Intent**: Keep PR conversation clean by updating one AI review comment instead of posting a new comment on every run.

**Contract**: The implementation must identify an existing bot-authored AI review comment by a stable marker, update it if present, or create it if absent. The rendered comment must include verdict, all five scores, and summary.

#### 2. Label lifecycle script or workflow step

**File**: `.github/workflows/review.yml` or `.github/scripts/sync-ai-review-labels.mjs`

**Intent**: Keep PR labels self-healing and non-contradictory.

**Contract**: Ensure `ai-cr:passed`, `ai-cr:failed`, and `ai-cr:review` exist with appropriate colors/descriptions if missing. Remove the stale verdict label, add the current verdict label, and remove `ai-cr:review` after a retry run completes.

#### 3. Failure-path comment behavior

**File**: `.github/workflows/review.yml` or `.github/scripts/upsert-ai-review-comment.mjs`

**Intent**: Make live model/API failures visible to PR authors.

**Contract**: If review generation fails, update the sticky comment with a clear failure message and leave/assign `ai-cr:failed` only when the failure should block merge according to workflow behavior. The plan does not require a diff cap, so oversized-context/model errors should be treated as review-generation failures with an actionable comment.

### Success Criteria:

#### Automated Verification:

- Comment rendering includes verdict, five scores, and Markdown summary from action output.
- Label sync logic cannot leave both `ai-cr:passed` and `ai-cr:failed` on the PR.
- Retry cleanup removes `ai-cr:review` after a labeled retry completes.

#### Manual Verification:

- On a test PR, first run creates one AI review comment.
- Pushing a new commit updates the same comment instead of creating a duplicate.
- Adding `ai-cr:review` reruns review and removes the retry label afterward.
- Verdict label changes replace the previous verdict label.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: End-to-End Verification and Documentation

### Overview

Verify the complete path locally and through a real PR smoke test with OpenRouter credentials.

### Changes Required:

#### 1. Local deterministic verification

**File**: repository root and `packages/code-reviewer/`

**Intent**: Ensure the workflow/action changes do not break existing app checks or reviewer package checks.

**Contract**: Run the repository handoff gate for config changes and the reviewer package checks. The package must still build independently.

#### 2. Live OpenRouter smoke

**File**: `packages/code-reviewer/`

**Intent**: Prove provider wiring works before relying on GitHub Actions.

**Contract**: With `OPENROUTER_API_KEY` configured locally, run the reviewer CLI or helper against a tiny TypeScript diff and confirm valid JSON output with `verdict`, `summary`, and five scores.

#### 3. PR workflow smoke

**File**: `.github/workflows/review.yml`

**Intent**: Prove the GitHub integration path: trigger, diff extraction, action, comment, labels, and retry.

**Contract**: Open or update a test PR with TypeScript changes, observe the workflow run, verify sticky comment and labels, then add `ai-cr:review` and verify retry behavior.

### Success Criteria:

#### Automated Verification:

- Astro sync passes: `npx astro sync`
- Lint passes: `npm run lint`
- Unit tests pass: `npm run test`
- App build passes: `npm run build`
- Code reviewer typecheck passes: `cd packages/code-reviewer && npm run typecheck`
- Code reviewer build passes: `cd packages/code-reviewer && npm run build`
- Live OpenRouter smoke returns valid structured JSON for a tiny TypeScript diff.

#### Manual Verification:

- Test PR to `main` runs `AI Code Review`.
- Workflow posts or updates exactly one sticky AI review comment.
- Workflow applies exactly one verdict label.
- Adding `ai-cr:review` triggers retry and the label is removed afterward.
- PRs with no TypeScript diff follow the chosen neutral/pass behavior without calling the model.

**Implementation Note**: This is the final verification phase. Record the live PR smoke outcome in the implementation handoff.

---

## Testing Strategy

### Unit Tests:

- If reviewer prompt construction is split into a pure helper, test that title and diff are included and body is excluded.
- If comment/label behavior is implemented as scripts with pure functions for rendering or label set calculation, test those pure functions locally.
- Do not add tests requiring GitHub API credentials or OpenRouter secrets to the normal test suite.

### Integration Tests:

- Use package typecheck/build as the main deterministic integration proof for `packages/code-reviewer`.
- Use workflow YAML inspection and a real PR smoke test for GitHub Actions behavior.
- Use a live OpenRouter smoke test outside the normal deterministic suite because the user has configured package/env access.

### Manual Testing Steps:

1. Create or update a PR to `main` with a small `.ts` or `.tsx` change.
2. Confirm `AI Code Review` runs and uses the local composite action.
3. Confirm exactly one sticky AI review comment exists and includes verdict, five scores, and summary.
4. Confirm exactly one of `ai-cr:passed` / `ai-cr:failed` is present.
5. Add `ai-cr:review`, confirm the workflow reruns, the same comment updates, and `ai-cr:review` is removed.
6. Push a PR update with no TypeScript diff and confirm the workflow follows the no-TypeScript policy without a model call.

## Performance Considerations

The chosen MVP reviews uncapped TypeScript diffs. This keeps implementation simple but may cause higher OpenRouter cost or model context failures on large TypeScript PRs. If failures or costs become common, the next iteration should add a diff byte/line cap or per-file summarization before the model call.

## Migration Notes

No data migration is required. Repository setup requires an `OPENROUTER_API_KEY` GitHub secret. The workflow can create missing labels automatically, so manual label setup should not be required if `issues: write` is available.

## References

- Related research: `context/changes/ci-cd-code-review/research.md`
- Requirements: `context/changes/ci-cd-code-review/requirements.md`
- Existing CI workflow: `.github/workflows/ci.yml:3-38`
- Draft review workflow: `.github/workflows/review.yml:1-15`
- Draft composite action: `.github/actions/ai-review/action.yml:1-32`
- Reviewer package entrypoint: `packages/code-reviewer/src/index.ts:20-44`
- Reviewer prompt: `packages/code-reviewer/src/prompts/code-review.ts:1-8`
- Reviewer schema: `packages/code-reviewer/src/schemas/review.ts:3-15`
- OpenRouter provider: `packages/code-reviewer/src/providers/openrouter.ts:12-28`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Reviewer Package Contract

#### Automated

- [x] 1.1 Code reviewer typecheck passes: `cd packages/code-reviewer && npm run typecheck` — cc4eaed
- [x] 1.2 Code reviewer build passes: `cd packages/code-reviewer && npm run build` — cc4eaed
- [x] 1.3 Existing direct CLI still returns valid JSON for a small TypeScript diff when `OPENROUTER_API_KEY` is configured — cc4eaed

#### Manual

- [x] 1.4 Inspect generated prompt behavior and confirm PR title is included while PR body remains excluded — cc4eaed
- [x] 1.5 Confirm the five existing score fields, `verdict`, and `summary` remain in the output contract — cc4eaed

### Phase 2: Composite Action

#### Automated

- [x] 2.1 Composite action metadata is syntactically valid YAML
- [x] 2.2 Action no longer references `secrets.*` directly
- [x] 2.3 Action no longer references nonexistent `.github/actions/ai-review/dist/review.js`
- [x] 2.4 Code reviewer typecheck/build still pass after action integration

#### Manual

- [x] 2.5 Inspect the action contract and confirm it exposes `verdict`, `summary`, and full JSON outputs
- [x] 2.6 Confirm the action contains no PR comment or label mutation logic

### Phase 3: GitHub Workflow Orchestration

#### Automated

- [ ] 3.1 Workflow YAML is syntactically valid
- [ ] 3.2 Workflow targets `main`, not `master`
- [ ] 3.3 Workflow uses the local action path, not the placeholder external action
- [ ] 3.4 Workflow declares required write permissions for comments and labels

#### Manual

- [ ] 3.5 Inspect event gating and confirm adding `ai-cr:passed` or `ai-cr:failed` cannot retrigger review
- [ ] 3.6 Confirm no Supabase or Cloudflare secrets are referenced by the review workflow

### Phase 4: PR Comment and Label Side Effects

#### Automated

- [ ] 4.1 Comment rendering includes verdict, five scores, and Markdown summary from action output
- [ ] 4.2 Label sync logic cannot leave both `ai-cr:passed` and `ai-cr:failed` on the PR
- [ ] 4.3 Retry cleanup removes `ai-cr:review` after a labeled retry completes

#### Manual

- [ ] 4.4 On a test PR, first run creates one AI review comment
- [ ] 4.5 Pushing a new commit updates the same comment instead of creating a duplicate
- [ ] 4.6 Adding `ai-cr:review` reruns review and removes the retry label afterward
- [ ] 4.7 Verdict label changes replace the previous verdict label

### Phase 5: End-to-End Verification and Documentation

#### Automated

- [ ] 5.1 Astro sync passes: `npx astro sync`
- [ ] 5.2 Lint passes: `npm run lint`
- [ ] 5.3 Unit tests pass: `npm run test`
- [ ] 5.4 App build passes: `npm run build`
- [ ] 5.5 Code reviewer typecheck passes: `cd packages/code-reviewer && npm run typecheck`
- [ ] 5.6 Code reviewer build passes: `cd packages/code-reviewer && npm run build`
- [ ] 5.7 Live OpenRouter smoke returns valid structured JSON for a tiny TypeScript diff

#### Manual

- [ ] 5.8 Test PR to `main` runs `AI Code Review`
- [ ] 5.9 Workflow posts or updates exactly one sticky AI review comment
- [ ] 5.10 Workflow applies exactly one verdict label
- [ ] 5.11 Adding `ai-cr:review` triggers retry and the label is removed afterward
- [ ] 5.12 PRs with no TypeScript diff follow the chosen neutral/pass behavior without calling the model
