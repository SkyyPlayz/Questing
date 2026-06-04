import { strict as assert } from "node:assert";
import { test } from "node:test";
import { canDecideApplication } from "../app/lib/applicationDecision";

test("application decisions require an open job and pending application", () => {
  assert.equal(canDecideApplication({ jobStatus: "OPEN", applicationStatus: "PENDING" }), true);

  for (const jobStatus of ["COMPLETED", "CANCELLED", "DISPUTED", "IN_PROGRESS", "DRAFT"] as const) {
    assert.equal(canDecideApplication({ jobStatus, applicationStatus: "PENDING" }), false);
  }

  for (const applicationStatus of ["ACCEPTED", "REJECTED", "WITHDRAWN", "FCFS_ACCEPTED"] as const) {
    assert.equal(canDecideApplication({ jobStatus: "OPEN", applicationStatus }), false);
  }
});
