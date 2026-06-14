import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  resolveAdminHeldPaymentReleaseAction,
  resolveJobStatusHeldPaymentAction,
} from "../app/lib/paymentReleasePolicy";

test("poster-only job completion does not release held payment", () => {
  assert.deepEqual(
    resolveJobStatusHeldPaymentAction({
      requestedStatus: "COMPLETED",
      paymentStatus: "HELD",
      paymentIntentId: "pi_123",
    }),
    { action: "none" },
  );
});

test("job cancellation still voids uncaptured held payment", () => {
  assert.deepEqual(
    resolveJobStatusHeldPaymentAction({
      requestedStatus: "CANCELLED",
      paymentStatus: "HELD",
      paymentIntentId: "pi_123",
    }),
    { action: "cancel", paymentStatus: "VOIDED" },
  );
});

test("admin capture is the valid held-payment release path", () => {
  assert.deepEqual(resolveAdminHeldPaymentReleaseAction("capture"), {
    action: "capture",
    paymentStatus: "RELEASED",
  });
});

test("unknown admin release actions are rejected by policy", () => {
  assert.equal(resolveAdminHeldPaymentReleaseAction("complete"), null);
});
