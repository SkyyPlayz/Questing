import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isValidJobStatus, JOB_STATUSES } from "../app/lib/jobStatus";

test("isValidJobStatus returns true for all valid statuses", () => {
  for (const status of ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTED"]) {
    assert.equal(isValidJobStatus(status), true, `Expected ${status} to be valid`);
  }
});

test("isValidJobStatus returns false for invalid status strings", () => {
  for (const bad of ["NOT_A_STATUS", "open", "draft", "", "null", "undefined", "OPEN "]) {
    assert.equal(isValidJobStatus(bad), false, `Expected "${bad}" to be invalid`);
  }
});

test("JOB_STATUSES set contains exactly the six expected values", () => {
  assert.equal(JOB_STATUSES.size, 6);
  assert.ok(JOB_STATUSES.has("DRAFT"));
  assert.ok(JOB_STATUSES.has("OPEN"));
  assert.ok(JOB_STATUSES.has("IN_PROGRESS"));
  assert.ok(JOB_STATUSES.has("COMPLETED"));
  assert.ok(JOB_STATUSES.has("CANCELLED"));
  assert.ok(JOB_STATUSES.has("DISPUTED"));
});
