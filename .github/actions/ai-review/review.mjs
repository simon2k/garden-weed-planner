import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { reviewPullRequest } from "../../../packages/code-reviewer/dist/index.js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function writeOutput(name, value) {
  const outputPath = requireEnv("GITHUB_OUTPUT");
  const delimiter = `ai_review_${name}_${randomUUID()}`;
  appendFileSync(outputPath, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

const title = requireEnv("REVIEW_PR_TITLE");
const diff = requireEnv("REVIEW_DIFF");

const review = await reviewPullRequest({ title, diff });
const reviewJson = JSON.stringify(review, null, 2);

writeOutput("verdict", review.verdict);
writeOutput("summary", review.summary);
writeOutput("review-json", reviewJson);
