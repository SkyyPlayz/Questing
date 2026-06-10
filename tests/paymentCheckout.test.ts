import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  createDurableCheckoutSession,
  type CheckoutDependencies,
  type CheckoutPaymentRecord,
} from "../app/lib/paymentCheckout";

function basePayment(overrides: Partial<CheckoutPaymentRecord> = {}): CheckoutPaymentRecord {
  return {
    id: "payment_1",
    jobId: "job_1",
    amount: 5000,
    status: "PENDING",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    ...overrides,
  };
}

function depsWithRecorder(events: string[]): CheckoutDependencies {
  return {
    createPendingPayment: async () => {
      events.push("create-payment");
      return basePayment();
    },
    createStripeCheckoutSession: async () => {
      events.push("create-stripe-session");
      return { id: "cs_test_1", url: "https://stripe.test/checkout" };
    },
    expireStripeCheckoutSession: async () => {
      events.push("expire-stripe-session");
    },
    markPaymentVoided: async () => {
      events.push("void-payment");
    },
    resetPaymentForRetry: async () => {
      events.push("reset-payment");
      return basePayment();
    },
    updatePaymentCheckoutSession: async () => {
      events.push("record-stripe-session");
    },
  };
}

test("checkout creates a local payment before creating a Stripe session", async () => {
  const events: string[] = [];

  const checkout = await createDurableCheckoutSession(
    {
      id: "job_1",
      title: "Fix porch",
      payRate: 50,
      payUnit: "job",
      startDate: null,
      endDate: null,
      payment: null,
    },
    "https://questing.test",
    depsWithRecorder(events),
  );

  assert.equal(checkout.url, "https://stripe.test/checkout");
  assert.deepEqual(events, ["create-payment", "create-stripe-session", "record-stripe-session"]);
});

test("checkout does not expose a Stripe URL when the local session update fails", async () => {
  const events: string[] = [];
  const deps = depsWithRecorder(events);
  deps.updatePaymentCheckoutSession = async () => {
    events.push("record-stripe-session");
    throw new Error("database unavailable");
  };

  await assert.rejects(
    () =>
      createDurableCheckoutSession(
        {
          id: "job_1",
          title: "Fix porch",
          payRate: 50,
          payUnit: "job",
          startDate: null,
          endDate: null,
          payment: null,
        },
        "https://questing.test",
        deps,
      ),
    /Checkout session could not be recorded locally/,
  );

  assert.deepEqual(events, ["create-payment", "create-stripe-session", "record-stripe-session", "expire-stripe-session"]);
});

test("checkout does not create a Stripe session when the local payment cannot be created", async () => {
  const events: string[] = [];
  const deps = depsWithRecorder(events);
  deps.createPendingPayment = async () => {
    events.push("create-payment");
    throw new Error("database unavailable");
  };

  await assert.rejects(
    () =>
      createDurableCheckoutSession(
        {
          id: "job_1",
          title: "Fix porch",
          payRate: 50,
          payUnit: "job",
          startDate: null,
          endDate: null,
          payment: null,
        },
        "https://questing.test",
        deps,
      ),
    /Payment could not be initialized locally/,
  );

  assert.deepEqual(events, ["create-payment"]);
});
