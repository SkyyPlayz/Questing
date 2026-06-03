import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  canManageApplicationAction,
  isApplicationAction,
} from "../app/lib/applicationActionAuthorization";

test("workers can withdraw their own applications without poster/admin permission", () => {
  assert.equal(canManageApplicationAction({
    action: "withdraw",
    userId: "worker-1",
    userRole: "WORKER",
    jobPosterId: "poster-1",
    applicationWorkerId: "worker-1",
  }), true);
});

test("workers cannot withdraw another worker's application", () => {
  assert.equal(canManageApplicationAction({
    action: "withdraw",
    userId: "worker-2",
    userRole: "WORKER",
    jobPosterId: "poster-1",
    applicationWorkerId: "worker-1",
  }), false);
});

test("accept and reject remain limited to poster or admin", () => {
  for (const action of ["accept", "reject"] as const) {
    assert.equal(canManageApplicationAction({
      action,
      userId: "poster-1",
      userRole: "POSTER",
      jobPosterId: "poster-1",
      applicationWorkerId: "worker-1",
    }), true);

    assert.equal(canManageApplicationAction({
      action,
      userId: "admin-1",
      userRole: "ADMIN",
      jobPosterId: "poster-1",
      applicationWorkerId: "worker-1",
    }), true);

    assert.equal(canManageApplicationAction({
      action,
      userId: "worker-1",
      userRole: "WORKER",
      jobPosterId: "poster-1",
      applicationWorkerId: "worker-1",
    }), false);
  }
});

test("application action validation rejects unknown actions", () => {
  assert.equal(isApplicationAction("withdraw"), true);
  assert.equal(isApplicationAction("cancel"), false);
  assert.equal(isApplicationAction(undefined), false);
});
