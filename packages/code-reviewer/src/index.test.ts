import test from "node:test";
import assert from "node:assert/strict";

import { reviewCodeDiff, reviewPullRequest, type CodeReviewAgentLike } from "./index.js";
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
  const agent: CodeReviewAgentLike = {
    async generate({ prompt }) {
      prompts.push(prompt);
      return { output };
    },
  };

  return { prompts, agent };
}

test("reviewPullRequest uses injected agent and includes title/diff in prompt", async () => {
  const { agent, prompts } = createAgent();

  const review = await reviewPullRequest({ title: "Injected agent PR", diff: "+const value: number = 1;" }, { agent });

  assert.equal(review, output);
  assert.match(prompts[0] ?? "", /Injected agent PR/);
  assert.match(prompts[0] ?? "", /const value: number = 1/);
});

test("reviewCodeDiff delegates to pull request review with injected agent", async () => {
  const { agent, prompts } = createAgent();

  const review = await reviewCodeDiff("+const value: number = 1;", { agent });

  assert.equal(review, output);
  assert.match(prompts[0] ?? "", /Direct diff review/);
  assert.match(prompts[0] ?? "", /const value: number = 1/);
});

test("reviewCodeDiff passes an empty diff through to the injected agent", async () => {
  const { agent, prompts } = createAgent();

  const review = await reviewCodeDiff("", { agent });

  assert.equal(review, output);
  assert.match(prompts[0] ?? "", /Diff TypeScript:/);
});

test("reviewPullRequest propagates provider or agent failures", async () => {
  const agent: CodeReviewAgentLike = {
    async generate() {
      throw new Error("provider unavailable");
    },
  };

  await assert.rejects(
    () => reviewPullRequest({ title: "Broken", diff: "+const value = 1;" }, { agent }),
    /provider unavailable/,
  );
});

test("reviewPullRequest validates OPENROUTER_API_KEY only when no agent is injected", async () => {
  const previous = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  try {
    await assert.rejects(
      () => reviewPullRequest({ title: "No injected agent", diff: "+const value = 1;" }),
      /Missing OPENROUTER_API_KEY/,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = previous;
    }
  }
});
