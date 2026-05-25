import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getStripeClient, getStripeWebhookSecret, StripeConfigurationError } from "../app/lib/stripe";

test("stripe helper imports without configured secrets", () => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  assert.ok(getStripeClient);
  assert.ok(getStripeWebhookSecret);
});

test("stripe client fails explicitly only when used without a secret key", () => {
  delete process.env.STRIPE_SECRET_KEY;

  assert.throws(() => getStripeClient(), {
    name: "StripeConfigurationError",
    message: "STRIPE_SECRET_KEY is not configured",
  });
});

test("stripe webhook secret fails explicitly only when used without a secret", () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;

  assert.throws(() => getStripeWebhookSecret(), {
    name: "StripeConfigurationError",
    message: "STRIPE_WEBHOOK_SECRET is not configured",
  });
});

test("stripe configuration errors expose the missing env var name only", () => {
  const error = new StripeConfigurationError("STRIPE_SECRET_KEY");

  assert.equal(error.envVar, "STRIPE_SECRET_KEY");
  assert.equal(error.message, "STRIPE_SECRET_KEY is not configured");
});
