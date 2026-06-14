import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateRatingScore } from "../app/lib/ratingInputValidation";

test("rating score validation accepts integer scores from 1 through 5", () => {
  for (const score of [1, 2, 3, 4, 5]) {
    assert.deepEqual(validateRatingScore(score), { ok: true, score });
  }
});

test("rating score validation rejects non-numeric, missing, and non-integer payloads", () => {
  for (const score of [undefined, null, "abc", "4", 0, 6, -1, 4.5, Number.NaN, Infinity]) {
    assert.deepEqual(validateRatingScore(score), { ok: false, error: "score must be an integer from 1 to 5" });
  }
});
