import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const unlockRoutePath = new URL("../app/api/jobs/[id]/unlock/route.ts", import.meta.url);

test("FCFS unlock preserves pending applicants while rejecting the expired FCFS lock", async () => {
  const source = await readFile(unlockRoutePath, "utf8");

  assert.match(source, /where:\s*{\s*id:\s*fcfsApp\.id\s*}/s);
  assert.match(source, /data:\s*{\s*status:\s*"REJECTED"\s*}/s);
  assert.match(source, /pendingAppsPreserved/s);
  assert.match(source, /data:\s*{\s*status:\s*"OPEN",\s*fcfsLockedAt:\s*null\s*}/s);
  assert.doesNotMatch(source, /where:\s*{\s*jobId:\s*id,\s*status:\s*"PENDING"\s*}[\s\S]*?data:\s*{\s*status:\s*"WITHDRAWN"\s*}/s);
});
