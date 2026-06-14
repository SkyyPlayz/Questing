import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  calculateRiskLevel,
  IncidentAuthorizationError,
  inferIncidentSubjectUserId,
} from "../app/lib/safetyIncident";

test("poster reports infer the accepted worker as incident subject", () => {
  assert.equal(
    inferIncidentSubjectUserId({
      reporterId: "poster-1",
      posterId: "poster-1",
      acceptedWorkerIds: ["worker-1"],
    }),
    "worker-1",
  );
});

test("worker reports infer the poster as incident subject", () => {
  assert.equal(
    inferIncidentSubjectUserId({
      reporterId: "worker-1",
      posterId: "poster-1",
      acceptedWorkerIds: ["worker-1"],
    }),
    "poster-1",
  );
});

test("incident subject cannot be the reporter", () => {
  assert.throws(
    () =>
      inferIncidentSubjectUserId({
        reporterId: "worker-1",
        posterId: "poster-1",
        acceptedWorkerIds: ["worker-1"],
        requestedSubjectUserId: "worker-1",
      }),
    /cannot be the reporter/,
  );
});

test("unrelated authenticated users cannot file incidents on jobs they are not part of", () => {
  assert.throws(
    () =>
      inferIncidentSubjectUserId({
        reporterId: "stranger-1",
        posterId: "poster-1",
        acceptedWorkerIds: ["worker-1"],
        requestedSubjectUserId: "worker-1",
      }),
    IncidentAuthorizationError,
  );
});

test("admins can file incidents on jobs they are not part of when subject is a participant", () => {
  assert.equal(
    inferIncidentSubjectUserId({
      reporterId: "admin-1",
      reporterRole: "ADMIN",
      posterId: "poster-1",
      acceptedWorkerIds: ["worker-1"],
      requestedSubjectUserId: "worker-1",
    }),
    "worker-1",
  );
});

test("risk level is based on resolved incidents for the subject", () => {
  assert.equal(calculateRiskLevel([]), "LOW");
  assert.equal(calculateRiskLevel([{ severity: "LOW" }]), "MEDIUM");
  assert.equal(calculateRiskLevel([{ severity: "CRITICAL" }]), "HIGH");
  assert.equal(calculateRiskLevel([{ severity: "LOW" }, { severity: "LOW" }, { severity: "MEDIUM" }]), "HIGH");
});
