import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('admin payment refunds can run after capture and preserve partial refund state', async () => {
  const route = await readFile(
    new URL('../app/api/payments/[id]/release/route.ts', import.meta.url),
    'utf8',
  );

  const refundBlock = route.match(/if \(action === "refund"\) \{[\s\S]*?\n  \}/)?.[0];

  assert.ok(refundBlock, 'refund action block should exist');
  assert.match(refundBlock, /!\["HELD", "RELEASED"\]\.includes\(payment\.status\)/);
  assert.match(refundBlock, /expand:\s*\["charge"\]/);
  assert.match(refundBlock, /refund\.charge\.refunded/);
  assert.match(refundBlock, /status:\s*isFullyRefunded \? "REFUNDED" : payment\.status/);
  assert.match(refundBlock, /amount:\s*refund\.amount/);
});

test('admin payment capture remains held-only', async () => {
  const route = await readFile(
    new URL('../app/api/payments/[id]/release/route.ts', import.meta.url),
    'utf8',
  );

  const captureBlock = route.match(/if \(action === "capture"\) \{[\s\S]*?return NextResponse\.json\(\{\n      payment: updated,[\s\S]*?\n    \}\);\n  \}/)?.[0];

  assert.ok(captureBlock, 'capture action block should exist');
  assert.match(captureBlock, /payment\.status !== "HELD"/);
  assert.match(captureBlock, /Payment is not in HELD state/);
});

test('stripe refund webhook only marks full refunds as refunded', async () => {
  const webhook = await readFile(
    new URL('../app/api/webhooks/stripe/route.ts', import.meta.url),
    'utf8',
  );
  const refundWebhookBlock = webhook.match(/case "charge\.refunded": \{[\s\S]*?\n      break;/)?.[0];

  assert.ok(refundWebhookBlock, 'charge.refunded webhook block should exist');
  assert.match(refundWebhookBlock, /status:\s*charge\.refunded \? "REFUNDED" : "RELEASED"/);
  assert.match(refundWebhookBlock, /status:\s*charge\.refunded \? "REFUNDED" : "PAID"/);
});
