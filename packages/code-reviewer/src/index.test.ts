import test from "node:test";
import assert from "node:assert/strict";

import { reviewCodeDiff, reviewPullRequest } from "./index.js";
import type { CodeReview } from "./schemas/review.js";

const output: CodeReview = {
  implementationCorrectness: 9,
  idiomaticity: 8,
  complexity: 7,
  testRiskCoverage: 6,
  securitySafety: 10,
  verdict: "pass",
  summary: "Looks good.",
};

function createAgent() {
  const prompts: string[] = [];
  return {
    prompts,
    agent: {
      async generate({ prompt }: { prompt: string }) {
        prompts.push(prompt);
        return { output };
      },
    },
  };
}

test("reviewPullRequest uses injected agent and includes title/diff in prompt", async () => {
  const { agent, prompts } = createAgent();

  const review = await reviewPullRequest(
    { title: "Injected agent PR", diff: "+const value: number = 1;" },
    { agent: agent as never },
  );

  assert.equal(review, output);
  assert.match(prompts[0] ?? "", /Injected agent PR/);
  assert.match(prompts[0] ?? "", /const value: number = 1/);
});

test("reviewCodeDiff delegates to pull request review with injected agent", async () => {
  const { agent, prompts } = createAgent();

  const review = await reviewCodeDiff("+const value: number = 1;", { agent: agent as never });

  assert.equal(review, output);
  assert.match(prompts[0] ?? "", /Direct diff review/);
  assert.match(prompts[0] ?? "", /const value: number = 1/);
});
