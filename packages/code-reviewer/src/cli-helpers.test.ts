import test from "node:test";
import assert from "node:assert/strict";

import { readStdin, readTitleArg } from "./cli-helpers.js";

test("readTitleArg reads --title", () => {
  assert.equal(readTitleArg(["--title", "My PR"], "Env PR"), "My PR");
});

test("readTitleArg falls back to PR_TITLE", () => {
  assert.equal(readTitleArg([], "Env PR"), "Env PR");
});

test("readTitleArg falls back to default title", () => {
  assert.equal(readTitleArg([], undefined), "Direct diff review");
});

test("readTitleArg rejects missing --title value", () => {
  assert.throws(() => readTitleArg(["--title"], undefined), /Missing value for --title/);
});

test("readStdin concatenates string and Buffer chunks", async () => {
  async function* chunks(): AsyncIterable<Buffer | string> {
    yield "abc";
    yield Buffer.from("def");
  }

  assert.equal(await readStdin(chunks()), "abcdef");
});
