import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  ACCEPTED_APPLICATION_STATUSES,
  acceptedApplicationForWorkerWhere,
  acceptedApplicationStatusWhere,
} from "../app/lib/acceptedApplicationStatuses";

test("accepted application status filters include FCFS accepted workers", () => {
  assert.deepEqual(ACCEPTED_APPLICATION_STATUSES, ["ACCEPTED", "FCFS_ACCEPTED"]);
  assert.deepEqual(acceptedApplicationStatusWhere(), { in: ["ACCEPTED", "FCFS_ACCEPTED"] });
});

test("accepted application worker filter treats FCFS accepted as participant work", () => {
  assert.deepEqual(acceptedApplicationForWorkerWhere("worker_123"), {
    workerId: "worker_123",
    status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] },
  });
});
