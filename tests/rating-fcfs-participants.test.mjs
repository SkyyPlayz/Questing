import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeSource = await readFile('app/api/jobs/[id]/rating/route.ts', 'utf8');

test('rating endpoint treats FCFS accepted applications as completed-job participants', () => {
  assert.match(
    routeSource,
    /applications:\s*\{\s*where:\s*\{\s*status:\s*\{\s*in:\s*\["ACCEPTED",\s*"FCFS_ACCEPTED"\]/,
  );
  assert.match(routeSource, /const isWorker = job\.applications\.some/);
});

test('competency recomputation includes FCFS completed jobs', () => {
  assert.match(
    routeSource,
    /workerId: userId,\s*status:\s*\{\s*in:\s*\["ACCEPTED",\s*"FCFS_ACCEPTED"\]/,
  );
  assert.match(routeSource, /const completed = jobs\.filter\(\(j\) => j\.status === "COMPLETED"\)\.length/);
});
