# ToolLoopAgent Code Reviewer Refactor Implementation Plan

## Overview

Refactor `packages/code-reviewer/src/index.ts` from a single-file `generateText` implementation into a modular, reusable AI SDK `ToolLoopAgent` code review agent. The change preserves the current JSON review contract and CLI behavior while extracting schemas, prompts, provider configuration, and agent construction into focused modules that can be imported by future promptfoo evals.

## Current State Analysis

`packages/code-reviewer/src/index.ts` currently combines every concern in one file: dotenv loading, OpenRouter setup, model defaults, review schema/type, system prompt, `generateText` execution, stdin reading, and CLI JSON output. The package already depends on `ai@6.0.219`, `@openrouter/ai-sdk-provider`, `zod`, `dotenv`, TypeScript, and `tsx`, so no new runtime dependency is required for `ToolLoopAgent`.

The installed AI SDK docs and source confirm that `ToolLoopAgent` accepts reusable configuration with `model`, `instructions`, and structured `output`; its `generate()` method delegates through the same core generation path and returns a result containing typed `output`. The repo also contains a rough `packages/code-reviewer/review.ts` prototype with a more detailed Polish code-review prompt, but that file is not valid production code and should be treated only as prompt inspiration.

## Desired End State

The code reviewer package exposes a reusable reviewer agent and a convenient `reviewCodeDiff(diff)` helper. Structured output schemas and prompt text live in separate modules, `src/index.ts` remains a thin public entrypoint plus direct-run CLI, and package consumers can import the schema/type, prompts, agent factory/default agent, and helper without depending on CLI internals.

Verification is complete when `packages/code-reviewer` type-checks and builds successfully, and the direct stdin CLI path still emits the same top-level JSON fields as before.

### Key Discoveries:

- `packages/code-reviewer/src/index.ts:7` defines the current `ReviewSchema`; this schema should be preserved to avoid breaking current JSON consumers.
- `packages/code-reviewer/src/index.ts:21` defines the current English prompt; the plan intentionally replaces the prompt text with the Polish prototype direction while preserving field names.
- `packages/code-reviewer/src/index.ts:26` exposes `reviewCodeDiff(diff)`; this helper is part of the desired public API and should remain available.
- `packages/code-reviewer/src/index.ts:53` contains the direct-run CLI guard; the plan keeps this behavior in `src/index.ts`.
- `packages/code-reviewer/node_modules/ai/docs/03-agents/02-building-agents.mdx:158` documents `ToolLoopAgent` structured output via `Output.object({ schema })`.
- `packages/code-reviewer/node_modules/ai/src/agent/tool-loop-agent.ts:138` shows `ToolLoopAgent.generate()` returns the underlying generation result, including typed output.
- `packages/code-reviewer/package.json` has no test script; verification for this change is limited to `npm run typecheck` and `npm run build`.

## What We're NOT Doing

- Not configuring promptfoo, eval datasets, eval scripts, or CI eval jobs.
- Not changing the public review JSON field names or adding richer findings/severity/file-location structures.
- Not switching away from OpenRouter or changing the existing `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `DEFAULT_MODEL` behavior.
- Not upgrading AI SDK from installed `6.0.219` to `7.x` in this change.
- Not adding a new test runner or mocked-model test harness.
- Not making `packages/code-reviewer/review.ts` the production entrypoint.

## Implementation Approach

Split the current single-file implementation by responsibility, then wire those modules back through `src/index.ts`. The core path should become: schema module defines the contract, prompt module builds review prompts, provider module resolves OpenRouter model configuration, agent module creates a `ToolLoopAgent`, reviewer helper calls `agent.generate()`, and `index.ts` re-exports the public API while preserving stdin CLI execution.

The main design choice is to export both a configurable factory and convenient defaults: `createCodeReviewerAgent()` supports future promptfoo/model injection, while `codeReviewerAgent` and `reviewCodeDiff()` keep current usage simple.

## Critical Implementation Details

### AI SDK version boundary

Use the installed `ai@6.0.219` API, not memory or newer `7.x` examples. The version-matched docs show `ToolLoopAgent` configured with `instructions` and structured `output`, and `ToolLoopAgent.generate()` returning the generated result with `output`.

### Import-time environment behavior

Avoid making future eval imports fail just because `OPENROUTER_API_KEY` is absent. Keep the missing-key error on the default runtime path that actually builds/calls the OpenRouter-backed agent, while allowing schema and prompt modules to be imported without reading secrets.

## Phase 1: Extract Review Contract and Prompts

### Overview

Move the structured output contract and prompt text out of `src/index.ts` without changing the JSON output shape. This phase creates the stable contract future modules and evals will import.

### Changes Required:

#### 1. Review schema module

**File**: `packages/code-reviewer/src/schemas/review.ts`

**Intent**: Define and export the preserved review output schema and inferred TypeScript type in a dedicated module. This makes the contract reusable by the agent, helper, CLI, and future eval assertions.

**Contract**: Export `ReviewSchema` and `CodeReview`. The schema must keep the existing top-level fields: `implementationCorrectness`, `idiomaticity`, `complexity`, `testRiskCoverage`, `securitySafety`, `verdict`, and `summary`.

#### 2. Prompt module

**File**: `packages/code-reviewer/src/prompts/code-review.ts`

**Intent**: Move review instructions and diff prompt construction into a prompt-focused module. Use the more detailed Polish prototype direction while keeping the structured output field names unchanged.

**Contract**: Export a system/instructions prompt constant suitable for `ToolLoopAgent` `instructions`, plus a function such as `createCodeReviewPrompt(diff: string): string` that builds the user prompt from a diff.

#### 3. Index cleanup preparation

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Remove inline schema and prompt ownership from the entrypoint after their modules exist. Keep temporary imports simple so later phases can replace generation logic cleanly.

**Contract**: `index.ts` should no longer define `ReviewSchema`, `CodeReview`, or the long review prompt inline once Phase 1 is complete.

### Success Criteria:

#### Automated Verification:

- Review schema module exports compile under `npm run typecheck`.
- Prompt module exports compile under `npm run typecheck`.
- Review schema preserves the existing seven top-level output fields.

#### Manual Verification:

- Human inspection confirms the Polish prompt is review-focused and still asks for the five scores, verdict, and Markdown summary.
- Human inspection confirms no promptfoo/eval files were added.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual review was successful before proceeding to the next phase.

---

## Phase 2: Introduce Reusable ToolLoopAgent Module

### Overview

Replace ad hoc `generateText` configuration with a reusable `ToolLoopAgent` factory and default OpenRouter-backed agent while preserving current environment-variable behavior.

### Changes Required:

#### 1. Provider configuration helper

**File**: `packages/code-reviewer/src/provider.ts`

**Intent**: Centralize OpenRouter provider/model setup so agent construction and CLI code do not duplicate environment handling. Preserve the current default model and missing-key error behavior.

**Contract**: Export `DEFAULT_MODEL` with value `openrouter/auto` and a helper that creates or returns the OpenRouter language model using `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.

#### 2. Code reviewer agent module

**File**: `packages/code-reviewer/src/agent.ts`

**Intent**: Define the reusable code reviewer `ToolLoopAgent` in one place. Provide both a configurable factory for future evals and a default agent for simple package usage.

**Contract**: Export `createCodeReviewerAgent(...)` and `codeReviewerAgent`. The factory must configure `ToolLoopAgent` with the review instructions and `Output.object({ schema: ReviewSchema })`; it should allow model/provider injection or option override without requiring promptfoo setup.

#### 3. Replace generateText dependency

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Stop using `generateText` directly in the public helper. Route review execution through the reusable agent abstraction.

**Contract**: `reviewCodeDiff(diff: string): Promise<CodeReview>` must call the reviewer agent’s `generate()` with the prompt from the prompt module and return `result.output`.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` passes in `packages/code-reviewer`.
- `npm run build` passes in `packages/code-reviewer`.
- `src/index.ts` no longer imports `generateText`.

#### Manual Verification:

- Human inspection confirms `createCodeReviewerAgent` can be used by future eval code without importing CLI-only stdin logic.
- Human inspection confirms OpenRouter env names and `DEFAULT_MODEL` remain compatible with `.env.example`.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual review was successful before proceeding to the next phase.

---

## Phase 3: Preserve Public API and CLI Entrypoint

### Overview

Make `src/index.ts` the package barrel plus direct-run CLI, preserving current stdin-to-JSON behavior while exposing the modular API for future consumers.

### Changes Required:

#### 1. Public exports

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Re-export the modules future code and evals need from the package entrypoint. Keep the public API discoverable from the package root.

**Contract**: Export `CodeReview`, `ReviewSchema`, prompt exports, `DEFAULT_MODEL`, provider helper exports, `createCodeReviewerAgent`, `codeReviewerAgent`, and `reviewCodeDiff` from the entrypoint as appropriate.

#### 2. CLI preservation

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Keep direct execution behavior equivalent to the current package: read diff from stdin, run review, print pretty JSON. Do not move CLI to a separate file in this change.

**Contract**: The existing direct-run guard behavior remains; `npm run dev` should still execute `tsx src/index.ts`, read stdin, and print `JSON.stringify(review, null, 2)`.

#### 3. Package declaration output check

**File**: `packages/code-reviewer/package.json`

**Intent**: Avoid package-script churn unless required. The current `main`, `types`, `dev`, `typecheck`, and `build` scripts should remain compatible with the refactor.

**Contract**: No package script or dependency changes unless TypeScript/build requires them for the modular source layout.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` passes in `packages/code-reviewer`.
- `npm run build` passes in `packages/code-reviewer`.
- Built declarations include the public reviewer helper and agent exports.

#### Manual Verification:

- Human inspection confirms `src/index.ts` is thin and does not re-accumulate schema/prompt/provider implementation details.
- Human inspection confirms the CLI still reads stdin and prints the same top-level JSON review shape.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual review was successful before proceeding to the next phase.

---

## Phase 4: Final Verification and Scope Guard

### Overview

Run the agreed verification commands and check that the refactor stayed within scope: reusable agent modules exist, the package builds, and no eval environment was configured.

### Changes Required:

#### 1. Verification commands

**File**: `packages/code-reviewer/package.json`

**Intent**: Use the package’s existing validation scripts rather than adding new test/eval infrastructure. This matches the selected verification scope.

**Contract**: From `packages/code-reviewer`, run `npm run typecheck` and `npm run build`.

#### 2. Scope audit

**File**: `packages/code-reviewer/`

**Intent**: Confirm the change did not introduce promptfoo configuration, eval datasets, CI changes, or AI SDK upgrades. This prevents the refactor from drifting into eval setup.

**Contract**: No promptfoo config files, eval scripts, eval datasets, or AI SDK version changes should be present as part of this change.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run typecheck`.
- Build passes: `npm run build`.

#### Manual Verification:

- Human inspection confirms no promptfoo/eval environment was configured.
- Human inspection confirms the final module layout is understandable and future eval-friendly.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual review was successful before marking the change implemented.

---

## Testing Strategy

### Unit Tests:

- No new unit tests are planned in this change because the user selected type/build verification only.
- The main regression checks are TypeScript contracts, successful package build, and manual inspection of the preserved JSON schema.

### Integration Tests:

- No promptfoo or live model integration tests are configured in this change.
- Future eval work can import the exported agent factory/default agent and schema from the package entrypoint.

### Manual Testing Steps:

1. Inspect `packages/code-reviewer/src/schemas/review.ts` and confirm the seven existing top-level fields remain unchanged.
2. Inspect `packages/code-reviewer/src/prompts/code-review.ts` and confirm the Polish prompt asks for the intended review criteria and Markdown summary.
3. Inspect `packages/code-reviewer/src/agent.ts` and confirm it uses `ToolLoopAgent`, not a hand-rolled tool loop.
4. Inspect `packages/code-reviewer/src/index.ts` and confirm it remains a thin export/CLI entrypoint.
5. Optionally run `npm run dev` with a small diff and valid OpenRouter env to confirm stdin-to-JSON behavior in a real model call.

## Performance Considerations

The refactor should not materially change runtime performance. `ToolLoopAgent` may use the same underlying generation path and default loop controls, but this reviewer has no tools and should complete on model output. Keep prompts concise enough for diff review and avoid adding file-system scanning or other local tools in this change.

## Migration Notes

This is an internal package refactor with a preserved JSON review contract. Existing consumers of `reviewCodeDiff(diff)` and direct `npm run dev` stdin usage should continue to work. Consumers importing undocumented inline constants from `src/index.ts` may need to switch to the new schema, prompt, provider, or agent module exports.

## References

- Current implementation: `packages/code-reviewer/src/index.ts:1`
- Current schema: `packages/code-reviewer/src/index.ts:7`
- Current helper: `packages/code-reviewer/src/index.ts:26`
- Current CLI guard: `packages/code-reviewer/src/index.ts:53`
- AI SDK ToolLoopAgent structured output docs: `packages/code-reviewer/node_modules/ai/docs/03-agents/02-building-agents.mdx:158`
- AI SDK ToolLoopAgent generate source: `packages/code-reviewer/node_modules/ai/src/agent/tool-loop-agent.ts:138`
- Change identity: `context/changes/tool-loop-agent/change.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Extract Review Contract and Prompts

#### Automated

- [x] 1.1 Review schema module exports compile under `npm run typecheck` — 749af9a
- [x] 1.2 Prompt module exports compile under `npm run typecheck` — 749af9a
- [x] 1.3 Review schema preserves the existing seven top-level output fields — 749af9a

#### Manual

- [x] 1.4 Human inspection confirms the Polish prompt is review-focused and still asks for the five scores, verdict, and Markdown summary — 749af9a
- [x] 1.5 Human inspection confirms no promptfoo/eval files were added — 749af9a

### Phase 2: Introduce Reusable ToolLoopAgent Module

#### Automated

- [x] 2.1 `npm run typecheck` passes in `packages/code-reviewer` — d46cb20
- [x] 2.2 `npm run build` passes in `packages/code-reviewer` — d46cb20
- [x] 2.3 `src/index.ts` no longer imports `generateText` — d46cb20

#### Manual

- [x] 2.4 Human inspection confirms `createCodeReviewerAgent` can be used by future eval code without importing CLI-only stdin logic — d46cb20
- [x] 2.5 Human inspection confirms OpenRouter env names and `DEFAULT_MODEL` remain compatible with `.env.example` — d46cb20

### Phase 3: Preserve Public API and CLI Entrypoint

#### Automated

- [x] 3.1 `npm run typecheck` passes in `packages/code-reviewer` — 05f9eb9
- [x] 3.2 `npm run build` passes in `packages/code-reviewer` — 05f9eb9
- [x] 3.3 Built declarations include the public reviewer helper and agent exports — 05f9eb9

#### Manual

- [x] 3.4 Human inspection confirms `src/index.ts` is thin and does not re-accumulate schema/prompt/provider implementation details — 05f9eb9
- [x] 3.5 Human inspection confirms the CLI still reads stdin and prints the same top-level JSON review shape — 05f9eb9

### Phase 4: Final Verification and Scope Guard

#### Automated

- [x] 4.1 Type checking passes: `npm run typecheck`
- [x] 4.2 Build passes: `npm run build`

#### Manual

- [x] 4.3 Human inspection confirms no promptfoo/eval environment was configured
- [x] 4.4 Human inspection confirms the final module layout is understandable and future eval-friendly
