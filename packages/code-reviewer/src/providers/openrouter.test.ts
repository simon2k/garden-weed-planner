import test from "node:test";
import assert from "node:assert/strict";

import { getOpenRouterApiKey } from "./openrouter.js";

test("getOpenRouterApiKey throws when required key is missing", () => {
  const previous = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  try {
    assert.throws(() => getOpenRouterApiKey({ required: true }), /Missing OPENROUTER_API_KEY/);
  } finally {
    if (previous === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = previous;
    }
  }
});

test("getOpenRouterApiKey returns undefined when key is optional", () => {
  const previous = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  try {
    assert.equal(getOpenRouterApiKey({ required: false }), undefined);
  } finally {
    if (previous === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = previous;
    }
  }
});
