import test from "node:test";
import assert from "node:assert/strict";

import { redactDiff } from "./redact-ai-review-diff.mjs";

test("redactDiff redacts common secret assignments and standalone tokens", () => {
  const { redacted, replacementCount } = redactDiff(
    `+OPENROUTER_API_KEY=sk-secret1234567890\n+const token = "ghp_abcdefghijklmnop";`,
  );

  assert.equal(replacementCount, 2);
  assert.match(redacted, /OPENROUTER_API_KEY=\[REDACTED\]/);
  assert.doesNotMatch(redacted, /sk-secret1234567890/);
  assert.doesNotMatch(redacted, /ghp_abcdefghijklmnop/);
});

test("redactDiff does not redact normal TypeScript env and variable references", () => {
  const input = `+const apiKey = process.env.OPENROUTER_API_KEY;\n+process.env.OPENROUTER_API_KEY = previous;\n+  requireApiKey = false,\n+  const resolvedApiKey = apiKey ?? getOpenRouterApiKey();`;

  const { redacted, replacementCount } = redactDiff(input);

  assert.equal(replacementCount, 0);
  assert.equal(redacted, input);
});
