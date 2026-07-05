import type { DeepPartial, LanguageModel } from "ai";
import { Output, ToolLoopAgent } from "ai";

import { CODE_REVIEW_SYSTEM_PROMPT } from "../prompts/code-review.js";
import { getOpenRouterModel } from "../providers/openrouter.js";
import { ReviewSchema, type CodeReview } from "../schemas/review.js";

export interface CreateCodeReviewerAgentOptions {
  model?: LanguageModel;
  instructions?: string;
}

export type CodeReviewOutput = Output.Output<CodeReview, DeepPartial<CodeReview>, never>;
export type CodeReviewerAgent = ToolLoopAgent<never, Record<string, never>, CodeReviewOutput>;

export function createCodeReviewerAgent({
  model = getOpenRouterModel(),
  instructions = CODE_REVIEW_SYSTEM_PROMPT,
}: CreateCodeReviewerAgentOptions = {}): CodeReviewerAgent {
  return new ToolLoopAgent({
    model,
    instructions,
    output: Output.object({ schema: ReviewSchema }),
  });
}

export const codeReviewerAgent: CodeReviewerAgent = createCodeReviewerAgent();
