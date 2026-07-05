# ToolLoopAgent Code Reviewer Refactor — Plan Brief

> Full plan: `context/changes/tool-loop-agent/plan.md`

## What & Why

Refactor `packages/code-reviewer/src/index.ts` from a single-file `generateText` script into a modular AI SDK `ToolLoopAgent` reviewer. The goal is to keep today’s CLI/helper behavior working while exposing reusable agent, schema, and prompt modules that future promptfoo evals can import.

## Starting Point

Today, `src/index.ts` owns env loading, OpenRouter setup, schema/type, prompt, model call, stdin reading, and CLI output. The package already has `ai@6.0.219`, whose bundled docs support `ToolLoopAgent` with `instructions` and structured `Output.object({ schema })`.

## Desired End State

The package exports a reusable reviewer agent factory/default agent plus `reviewCodeDiff(diff)`. Review schemas and prompts live in separate modules, the current seven-field JSON contract is preserved, and `src/index.ts` stays as a thin barrel plus direct-run stdin CLI.

## Key Decisions Made

| Decision             | Choice                                   | Why                                                                          |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| Public API           | Export agent + helper                    | Supports future evals while preserving simple programmatic use.              |
| Agent initialization | Factory + default agent                  | Allows future model/provider injection without removing convenient defaults. |
| Output schema        | Preserve current seven fields            | Avoids breaking current JSON consumers during a refactor.                    |
| Provider config      | Preserve OpenRouter env                  | Keeps runtime behavior and `.env.example` compatible.                        |
| Prompt language      | Polish prototype prompt                  | Intentionally improves review instructions while keeping field names stable. |
| CLI layout           | Thin `index.ts` with exports + CLI guard | Keeps `npm run dev` stdin flow working without package script churn.         |
| Verification         | Typecheck/build only                     | Matches the selected scope and avoids adding eval/test infrastructure now.   |

## Scope

**In scope:**

- Extract `ReviewSchema` and `CodeReview` to a schema module.
- Extract review instructions and diff prompt builder to a prompt module.
- Add OpenRouter provider/model helper preserving current env names.
- Add `createCodeReviewerAgent()` and default `codeReviewerAgent` using `ToolLoopAgent`.
- Reimplement `reviewCodeDiff()` through the agent.
- Keep direct stdin-to-JSON CLI behavior in `src/index.ts`.

**Out of scope:**

- Promptfoo configuration, eval datasets, eval scripts, or CI eval jobs.
- Changing review JSON field names or adding structured findings.
- Switching providers or upgrading AI SDK.
- Adding a new test runner or mocked-model harness.

## Architecture / Approach

The refactor separates responsibilities: `schemas/review.ts` owns the output contract, `prompts/code-review.ts` owns instructions and prompt construction, `provider.ts` owns OpenRouter model resolution, `agent.ts` owns the `ToolLoopAgent` factory/default, and `index.ts` re-exports the public API while preserving CLI execution.

## Phases at a Glance

| Phase                                      | What it delivers                                                        | Key risk                                             |
| ------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| 1. Extract Review Contract and Prompts     | Dedicated schema/type and Polish prompt modules                         | Accidentally changing JSON shape                     |
| 2. Introduce Reusable ToolLoopAgent Module | Provider helper, agent factory, default agent, helper via `.generate()` | Misusing installed AI SDK API                        |
| 3. Preserve Public API and CLI Entrypoint  | Thin barrel exports plus stdin JSON CLI                                 | Re-accumulating implementation details in `index.ts` |
| 4. Final Verification and Scope Guard      | Typecheck/build and no-eval audit                                       | Scope creep into promptfoo setup                     |

**Prerequisites:** Existing `packages/code-reviewer` dependencies installed, especially `ai@6.0.219` and `@openrouter/ai-sdk-provider`.
**Estimated effort:** ~1 focused implementation session across 4 small phases.

## Open Risks & Assumptions

- Import-time construction of the default agent must not make future eval/schema imports fail unexpectedly when OpenRouter secrets are absent.
- The Polish prompt intentionally changes model behavior/language while preserving the output field contract.
- No live LLM regression test is required for this change; validation relies on typecheck, build, and manual inspection.

## Success Criteria (Summary)

- `npm run typecheck` and `npm run build` pass in `packages/code-reviewer`.
- The package exports reusable schema, prompt, provider, agent, and helper APIs.
- No promptfoo/eval environment is configured, and the CLI still reads stdin and prints the preserved JSON shape.
