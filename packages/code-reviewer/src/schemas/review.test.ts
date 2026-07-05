import test from "node:test";
import assert from "node:assert/strict";

import { ReviewSchema } from "./review.js";

const validReview = {
  implementationCorrectness: 10,
  idiomaticity: 9,
  complexity: 8,
  testRiskCoverage: 7,
  securitySafety: 6,
  verdict: "pass",
  summary: "Looks good.",
};

test("ReviewSchema accepts integer scores from 1 to 10", () => {
  assert.equal(ReviewSchema.parse(validReview).verdict, "pass");
});

test("ReviewSchema rejects scores below 1", () => {
  assert.throws(() => ReviewSchema.parse({ ...validReview, implementationCorrectness: 0 }));
});

test("ReviewSchema rejects scores above 10", () => {
  assert.throws(() => ReviewSchema.parse({ ...validReview, securitySafety: 11 }));
});

test("ReviewSchema rejects fractional scores", () => {
  assert.throws(() => ReviewSchema.parse({ ...validReview, complexity: 7.5 }));
});
