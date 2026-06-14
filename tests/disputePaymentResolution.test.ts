import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resolveHeldDisputePayment } from "../app/lib/disputePaymentResolution";

test("worker-favor disputes release held funds to the worker", () => {
  assert.deepEqual(resolveHeldDisputePayment("WORKER_FAVOR", 10000), {
    action: "capture",
    paymentStatus: "RELEASED",
  });
});

test("poster-favor disputes void uncaptured held funds instead of capturing them", () => {
  assert.deepEqual(resolveHeldDisputePayment("POSTER_FAVOR", 10000), {
    action: "cancel",
    paymentStatus: "VOIDED",
  });
});

test("split disputes capture half of the held amount", () => {
  assert.deepEqual(resolveHeldDisputePayment("SPLIT", 10001), {
    action: "capture",
    paymentStatus: "RELEASED",
    amountToCapture: 5000,
  });
});

test("dismissed disputes void uncaptured held funds", () => {
  assert.deepEqual(resolveHeldDisputePayment("DISMISSED", 10000), {
    action: "cancel",
    paymentStatus: "VOIDED",
  });
});
