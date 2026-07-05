import { createCodeReviewerAgent } from "./agents/reviewer.js";
import { createCodeReviewPrompt, type CodeReviewPromptInput } from "./prompts/code-review.js";
import { getOpenRouterApiKey } from "./providers/openrouter.js";
import type { CodeReview } from "./schemas/review.js";

export { createCodeReviewerAgent } from "./agents/reviewer.js";
export type { CodeReviewOutput, CodeReviewerAgent, CreateCodeReviewerAgentOptions } from "./agents/reviewer.js";
export { CODE_REVIEW_SYSTEM_PROMPT, createCodeReviewPrompt } from "./prompts/code-review.js";
export type { CodeReviewPromptInput } from "./prompts/code-review.js";
export { DEFAULT_MODEL, getOpenRouterApiKey, getOpenRouterModel } from "./providers/openrouter.js";
export type { OpenRouterModelOptions } from "./providers/openrouter.js";
export { ReviewSchema } from "./schemas/review.js";
export type { CodeReview } from "./schemas/review.js";

export type ReviewPullRequestInput = CodeReviewPromptInput;

export interface CodeReviewAgentLike {
  generate(input: { prompt: string }): Promise<{ output: CodeReview }>;
}

export interface ReviewCodeDiffOptions {
  agent?: CodeReviewAgentLike;
}

function createDefaultReviewer(): CodeReviewAgentLike {
  getOpenRouterApiKey({ required: true });
  return createCodeReviewerAgent();
}

export async function reviewPullRequest(
  input: ReviewPullRequestInput,
  { agent }: ReviewCodeDiffOptions = {},
): Promise<CodeReview> {
  const reviewer = agent ?? createDefaultReviewer();
  const { output } = await reviewer.generate({
    prompt: createCodeReviewPrompt(input),
  });

  return output;
}

export async function reviewCodeDiff(diff: string, options: ReviewCodeDiffOptions = {}): Promise<CodeReview> {
  return reviewPullRequest({ title: "Direct diff review", diff }, options);
}
