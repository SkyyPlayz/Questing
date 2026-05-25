import { strict as assert } from "node:assert";
import { test } from "node:test";
import { canReportIncident } from "../app/lib/incidentAccess";

test("unrelated user cannot report incident", () => {
  assert.equal(
    canReportIncident({
      userId: "user-3",
      userRole: "USER",
      posterId: "user-1",
      acceptedWorkerIds: ["user-2"],
    }),
    false,
  );
});

test("poster can report incident", () => {
  assert.equal(
    canReportIncident({
      userId: "user-1",
      userRole: "USER",
      posterId: "user-1",
      acceptedWorkerIds: ["user-2"],
    }),
    true,
  );
});

test("accepted worker can report incident", () => {
  assert.equal(
    canReportIncident({
      userId: "user-2",
      userRole: "USER",
      posterId: "user-1",
      acceptedWorkerIds: ["user-2"],
    }),
    true,
  );
});

test("admin can report incident", () => {
  assert.equal(
    canReportIncident({
      userId: "admin-1",
      userRole: "ADMIN",
      posterId: "user-1",
      acceptedWorkerIds: ["user-2"],
    }),
    true,
  );
});
