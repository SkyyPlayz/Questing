import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildJobDetailApplicationsQuery,
  buildJobDetailJobQuery,
  canViewJobApplications,
} from "../app/lib/jobDetailVisibility";

test("job detail base query excludes private related records and poster email", () => {
  assert.deepEqual(buildJobDetailJobQuery("job_1"), {
    where: { id: "job_1" },
    include: { poster: { select: { id: true, name: true } } },
  });
});

test("unauthenticated job detail does not query applications", () => {
  assert.equal(canViewJobApplications({ posterId: "poster_1" }, null), false);
  assert.equal(buildJobDetailApplicationsQuery("job_1", null, false), null);
});

test("job poster and admin can view full applicant details", () => {
  assert.equal(
    canViewJobApplications({ posterId: "poster_1" }, { id: "poster_1", role: "POSTER" }),
    true,
  );
  assert.equal(
    canViewJobApplications({ posterId: "poster_1" }, { id: "admin_1", role: "ADMIN" }),
    true,
  );

  assert.deepEqual(
    buildJobDetailApplicationsQuery(
      "job_1",
      { id: "poster_1", role: "POSTER" },
      true,
    ),
    {
      where: { jobId: "job_1" },
      include: { worker: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    },
  );
});

test("authenticated non-owner only queries their own application status", () => {
  assert.equal(
    canViewJobApplications({ posterId: "poster_1" }, { id: "worker_1", role: "WORKER" }),
    false,
  );
  assert.deepEqual(
    buildJobDetailApplicationsQuery(
      "job_1",
      { id: "worker_1", role: "WORKER" },
      false,
    ),
    {
      where: { jobId: "job_1", workerId: "worker_1" },
      select: { id: true, workerId: true, status: true },
      orderBy: { createdAt: "asc" },
    },
  );
});
