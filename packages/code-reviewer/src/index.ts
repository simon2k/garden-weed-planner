import "dotenv/config";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";

import { createCodeReviewPrompt, CODE_REVIEW_SYSTEM_PROMPT } from "./prompts/code-review.js";
import { ReviewSchema, type CodeReview } from "./schemas/review.js";

export const DEFAULT_MODEL = "openrouter/auto";

export async function reviewCodeDiff(diff: string): Promise<CodeReview> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");
  }

  const openrouter = createOpenRouter({ apiKey });
  const modelName = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  const { output } = await generateText({
    model: openrouter(modelName),
    system: CODE_REVIEW_SYSTEM_PROMPT,
    prompt: createCodeReviewPrompt(diff),
    output: Output.object({ schema: ReviewSchema }),
  });

  return output;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const diff = await readStdin();
  const review = await reviewCodeDiff(diff);
  console.log(JSON.stringify(review, null, 2));
}
