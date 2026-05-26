import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildActiveWorkerApplicationsQuery } from "../app/lib/activeJobsQuery";

test("active worker applications query only includes accepted applications for in-progress jobs", () => {
  assert.deepEqual(buildActiveWorkerApplicationsQuery("worker_123"), {
    where: {
      workerId: "worker_123",
      status: "ACCEPTED",
      job: { status: "IN_PROGRESS" },
    },
    include: {
      job: {
        include: { poster: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
});
