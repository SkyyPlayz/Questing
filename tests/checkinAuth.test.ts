import { strict as assert } from "node:assert";
import { test } from "node:test";
import { canViewCheckIns } from "../app/lib/checkinAuth";

const posterJob = {
  posterId: "poster-1",
  applications: [{ workerId: "worker-1" }],
};

test("job poster can view check-ins", () => {
  assert.equal(canViewCheckIns("poster-1", "POSTER", posterJob), true);
});

test("accepted worker can view check-ins", () => {
  assert.equal(canViewCheckIns("worker-1", "WORKER", posterJob), true);
});

test("admin can view check-ins for any job", () => {
  assert.equal(canViewCheckIns("admin-99", "ADMIN", posterJob), true);
});

test("unrelated authenticated user cannot view check-ins", () => {
  assert.equal(canViewCheckIns("stranger-42", "WORKER", posterJob), false);
});

test("unrelated poster cannot view another poster's job check-ins", () => {
  assert.equal(canViewCheckIns("other-poster", "POSTER", posterJob), false);
});

test("job with no accepted applications denies unrelated user", () => {
  const jobNoApps = { posterId: "poster-1", applications: [] };
  assert.equal(canViewCheckIns("worker-99", "WORKER", jobNoApps), false);
});

test("job with multiple accepted workers allows each worker individually", () => {
  const multiWorkerJob = {
    posterId: "poster-1",
    applications: [{ workerId: "worker-1" }, { workerId: "worker-2" }],
  };
  assert.equal(canViewCheckIns("worker-1", "WORKER", multiWorkerJob), true);
  assert.equal(canViewCheckIns("worker-2", "WORKER", multiWorkerJob), true);
  assert.equal(canViewCheckIns("worker-3", "WORKER", multiWorkerJob), false);
});
