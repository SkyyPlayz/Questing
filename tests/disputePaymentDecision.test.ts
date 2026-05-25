import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getHeldDisputePaymentDecision } from "../app/lib/disputePaymentDecision";

test("WORKER_FAVOR captures full held payment and releases it", () => {
  assert.deepEqual(getHeldDisputePaymentDecision("WORKER_FAVOR", 10001), {
    stripeAction: "capture",
    paymentStatus: "RELEASED",
    platformFeeBaseAmountCents: 10001,
    voidPendingPlatformFees: false,
  });
});

test("POSTER_FAVOR cancels held payment and voids it", () => {
  assert.deepEqual(getHeldDisputePaymentDecision("POSTER_FAVOR", 10001), {
    stripeAction: "cancel",
    paymentStatus: "VOIDED",
    platformFeeBaseAmountCents: 0,
    voidPendingPlatformFees: true,
  });
});

test("SPLIT captures half held payment and releases it", () => {
  assert.deepEqual(getHeldDisputePaymentDecision("SPLIT", 10001), {
    stripeAction: "capture",
    paymentStatus: "RELEASED",
    amountToCapture: 5000,
    platformFeeBaseAmountCents: 5000,
    voidPendingPlatformFees: false,
  });
});

test("DISMISSED cancels held payment and voids it", () => {
  assert.deepEqual(getHeldDisputePaymentDecision("DISMISSED", 10001), {
    stripeAction: "cancel",
    paymentStatus: "VOIDED",
    platformFeeBaseAmountCents: 0,
    voidPendingPlatformFees: true,
  });
});
