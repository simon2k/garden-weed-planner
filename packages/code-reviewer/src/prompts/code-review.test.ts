import test from "node:test";
import assert from "node:assert/strict";

import { createCodeReviewPrompt } from "./code-review.js";

test("createCodeReviewPrompt includes PR title and TypeScript diff", () => {
  const prompt = createCodeReviewPrompt({
    title: "Add reviewer workflow",
    diff: "diff --git a/src/a.ts b/src/a.ts",
  });

  assert.match(prompt, /Add reviewer workflow/);
  assert.match(prompt, /diff --git a\/src\/a\.ts b\/src\/a\.ts/);
  assert.match(prompt, /Diff TypeScript/);
});

test("createCodeReviewPrompt does not include PR body content", () => {
  const prompt = createCodeReviewPrompt({
    title: "Title only",
    diff: "+const value = 1;",
  });

  assert.doesNotMatch(prompt, /Opis PR/);
  assert.doesNotMatch(prompt, /Pull request body/);
});

test("createCodeReviewPrompt normalizes empty titles", () => {
  const prompt = createCodeReviewPrompt({ title: "   ", diff: "+const value = 1;" });

  assert.match(prompt, /\(brak tytułu PR\)/);
});
