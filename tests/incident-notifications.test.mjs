import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('incident notifications consider selected and FCFS-accepted workers only', async () => {
  const source = await readFile(new URL('../app/api/incidents/route.ts', import.meta.url), 'utf8');

  assert.match(source, /applications:\s*{\s*where:\s*{\s*status:\s*{\s*in:\s*\[\s*"ACCEPTED",\s*"FCFS_ACCEPTED"\s*\]/s);
  assert.doesNotMatch(source, /applications:\s*{\s*where:\s*{\s*status:\s*"ACCEPTED"/s);
  assert.doesNotMatch(source, /applications:\s*{\s*where:\s*{\s*status:\s*{\s*in:\s*\[[^\]]*"PENDING"/s);
  assert.doesNotMatch(source, /applications:\s*{\s*where:\s*{\s*status:\s*{\s*in:\s*\[[^\]]*"REJECTED"/s);
});
