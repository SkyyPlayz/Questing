import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('platform fee helper upserts by jobId', async () => {
  const helper = await readFile(new URL('../app/lib/platform-fees.ts', import.meta.url), 'utf8');

  assert.match(helper, /platformFee\.upsert\(\{/);
  assert.match(helper, /where:\s*\{\s*jobId\s*\}/);
  assert.match(helper, /create:\s*\{[\s\S]*?jobId,[\s\S]*?status:\s*"RELEASED"/);
  assert.match(helper, /update:\s*\{[\s\S]*?status:\s*"RELEASED"/);
});

test('job completion records platform fee through idempotent helper', async () => {
  const route = await readFile(
    new URL('../app/api/jobs/[id]/route.ts', import.meta.url),
    'utf8',
  );
  const completionBlock = route.match(
    /if \(status === "COMPLETED" && updated\.payment\.status === "HELD"\) \{[\s\S]*?\n    \} else if \(status === "CANCELLED"/
  )?.[0];

  assert.ok(completionBlock, 'paid job completion block should exist');
  assert.match(completionBlock, /recordReleasedPlatformFee\(updated\.id,\s*updated\.payment\.amount\)/);
  assert.doesNotMatch(completionBlock, /platformFee\.create/);
});

test('stripe succeeded webhook records platform fee through idempotent helper', async () => {
  const route = await readFile(new URL('../app/api/webhooks/stripe/route.ts', import.meta.url), 'utf8');
  const succeededBlock = route.match(/case "payment_intent\.succeeded": \{[\s\S]*?\n      break;/)?.[0];

  assert.ok(succeededBlock, 'payment_intent.succeeded block should exist');
  assert.match(succeededBlock, /recordReleasedPlatformFee\(pi\.metadata\.jobId,\s*pi\.amount\)/);
  assert.doesNotMatch(succeededBlock, /platformFee\.create/);
});
