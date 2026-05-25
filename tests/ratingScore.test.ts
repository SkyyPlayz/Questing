import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseRatingScore } from "../app/lib/ratingScore";

test("rating score parser rejects non-numeric and non-integer values", () => {
  assert.equal(parseRatingScore("abc"), null);
  assert.equal(parseRatingScore("5"), null);
  assert.equal(parseRatingScore(4.5), null);
  assert.equal(parseRatingScore(null), null);
});

test("rating score parser rejects out-of-range values", () => {
  assert.equal(parseRatingScore(0), null);
  assert.equal(parseRatingScore(6), null);
});

test("rating score parser accepts integers from 1 to 5", () => {
  assert.equal(parseRatingScore(1), 1);
  assert.equal(parseRatingScore(5), 5);
});
