import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const profileRoute = readFileSync('app/api/profile/background-check/route.ts', 'utf8');
const stripeWebhook = readFileSync('app/api/webhooks/stripe/route.ts', 'utf8');
const schema = readFileSync('prisma/schema.prisma', 'utf8');
const migration = readFileSync(
  'prisma/migrations/20260526162000_background_check_fee_checkout_reconciliation/migration.sql',
  'utf8',
);

test('background check checkout stores a Stripe session id and blocks active pending duplicates', () => {
  assert.match(profileRoute, /status:\s*\{\s*notIn:\s*\["VOIDED"\]\s*\}/);
  assert.match(profileRoute, /stripeCheckoutSessionId:\s*checkoutSession\.id/);
  assert.match(profileRoute, /Background check payment already pending/);
});

test('background check webhooks reconcile by checkout session or payment intent, not worker-wide pending rows', () => {
  assert.match(stripeWebhook, /where:\s*\{\s*stripeCheckoutSessionId:\s*session\.id,\s*status:\s*"PENDING"\s*\}/);
  assert.match(stripeWebhook, /where:\s*\{\s*stripePaymentIntentId:\s*pi\.id,\s*status:\s*"PENDING"\s*\}/);
  assert.doesNotMatch(stripeWebhook, /workerId:\s*session\.metadata\.workerId,\s*status:\s*"PENDING"/);
  assert.doesNotMatch(stripeWebhook, /workerId:\s*pi\.metadata\.workerId,\s*status:\s*"PENDING"/);
});

test('background check fee persistence has checkout-session uniqueness and one pending row per worker', () => {
  assert.match(schema, /stripeCheckoutSessionId\s+String\?\s+@unique/);
  assert.match(migration, /CREATE UNIQUE INDEX "BackgroundCheckFee_one_pending_per_worker_idx"/);
  assert.match(migration, /WHERE "status" = 'PENDING'/);
});
