import "dotenv/config";

import { codeReviewerAgent } from "./agents/reviewer.js";
import { createCodeReviewPrompt, type CodeReviewPromptInput } from "./prompts/code-review.js";
import { getOpenRouterApiKey } from "./providers/openrouter.js";
import type { CodeReview } from "./schemas/review.js";

export { codeReviewerAgent, createCodeReviewerAgent } from "./agents/reviewer.js";
export type { CreateCodeReviewerAgentOptions } from "./agents/reviewer.js";
export { CODE_REVIEW_SYSTEM_PROMPT, createCodeReviewPrompt } from "./prompts/code-review.js";
export type { CodeReviewPromptInput } from "./prompts/code-review.js";
export { DEFAULT_MODEL, getOpenRouterApiKey, getOpenRouterModel } from "./providers/openrouter.js";
export type { OpenRouterModelOptions } from "./providers/openrouter.js";
export { ReviewSchema } from "./schemas/review.js";
export type { CodeReview } from "./schemas/review.js";

export type ReviewPullRequestInput = CodeReviewPromptInput;

export interface ReviewCodeDiffOptions {
  agent?: typeof codeReviewerAgent;
}

export async function reviewPullRequest(
  input: ReviewPullRequestInput,
  { agent }: ReviewCodeDiffOptions = {},
): Promise<CodeReview> {
  if (!agent) {
    getOpenRouterApiKey({ required: true });
  }

  const reviewer = agent ?? codeReviewerAgent;
  const { output } = await reviewer.generate({
    prompt: createCodeReviewPrompt(input),
  });

  return output;
}

export async function reviewCodeDiff(diff: string, options: ReviewCodeDiffOptions = {}): Promise<CodeReview> {
  return reviewPullRequest({ title: "Direct diff review", diff }, options);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function readTitleArg(argv: string[]): string {
  const titleFlagIndex = argv.indexOf("--title");
  if (titleFlagIndex >= 0) {
    const title = argv[titleFlagIndex + 1];
    if (!title) {
      throw new Error("Missing value for --title.");
    }
    return title;
  }

  return process.env.PR_TITLE ?? "Direct diff review";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const title = readTitleArg(process.argv.slice(2));
  const diff = await readStdin();
  const review = await reviewPullRequest({ title, diff });
  console.log(JSON.stringify(review, null, 2));
}
