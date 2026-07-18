import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyBackgroundCheckPaymentCompletion } from "../app/lib/stripeWebhookBackgroundCheck";

test("checkout completion updates only background check fee payment state", async () => {
  let workerProfileTouched = false;
  const calls: Array<{
    where: { workerId: string; status: "PENDING" };
    data: { stripePaymentIntentId: string; status: "PAID" };
  }> = [];
  const prisma = {
    backgroundCheckFee: {
      async updateMany(args: {
        where: { workerId: string; status: "PENDING" };
        data: { stripePaymentIntentId: string; status: "PAID" };
      }) {
        calls.push(args);
      },
    },
    workerProfile: {
      async updateMany() {
        workerProfileTouched = true;
      },
    },
  };

  await applyBackgroundCheckPaymentCompletion({
    session: {
      payment_intent: "pi_123",
      metadata: { workerId: "worker_123" },
    },
    prisma,
  });

  assert.equal(workerProfileTouched, false);
  assert.deepEqual(calls, [
    {
      where: { workerId: "worker_123", status: "PENDING" },
      data: { stripePaymentIntentId: "pi_123", status: "PAID" },
    },
  ]);
});

test("checkout completion without worker metadata does not change payment state", async () => {
  let called = false;
  const prisma = {
    backgroundCheckFee: {
      async updateMany() {
        called = true;
      },
    },
  };

  await applyBackgroundCheckPaymentCompletion({
    session: {
      payment_intent: "pi_123",
      metadata: null,
    },
    prisma,
  });

  assert.equal(called, false);
});
