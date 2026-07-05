import test from "node:test";
import assert from "node:assert/strict";

import { runCodeReviewerCli } from "./cli-runner.js";
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

async function* stdin(value: string): AsyncIterable<string> {
  yield value;
}

function writable() {
  let text = "";
  return {
    stream: {
      write(chunk: string | Uint8Array) {
        text += chunk.toString();
        return true;
      },
    },
    text: () => text,
  };
}

test("runCodeReviewerCli writes JSON review output", async () => {
  const stdout = writable();
  const stderr = writable();
  const seen: { title: string; diff: string }[] = [];

  const exitCode = await runCodeReviewerCli({
    argv: ["--title", "CLI PR"],
    stdin: stdin("+const value = 1;"),
    stdout: stdout.stream,
    stderr: stderr.stream,
    async review(input) {
      seen.push(input);
      return output;
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(seen, [{ title: "CLI PR", diff: "+const value = 1;" }]);
  assert.deepEqual(JSON.parse(stdout.text()), output);
  assert.equal(stderr.text(), "");
});

test("runCodeReviewerCli reports review failures without throwing", async () => {
  const stdout = writable();
  const stderr = writable();

  const exitCode = await runCodeReviewerCli({
    argv: [],
    envTitle: "Env PR",
    stdin: stdin("+const value = 1;"),
    stdout: stdout.stream,
    stderr: stderr.stream,
    async review() {
      throw new Error("provider unavailable");
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(stdout.text(), "");
  assert.match(stderr.text(), /AI code review failed: provider unavailable/);
});
