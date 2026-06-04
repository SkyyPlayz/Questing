import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseJsonBody } from "../app/lib/api-json";

test("parseJsonBody returns structured 400 for malformed JSON", async () => {
  const result = await parseJsonBody(
    new Request("https://questing.test/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{\"jobId\":",
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.response.status, 400);
  assert.deepEqual(await result.response.json(), {
    error: "Malformed JSON request body",
  });
});

test("parseJsonBody returns parsed data for valid JSON", async () => {
  const result = await parseJsonBody<{ jobId: string }>(
    new Request("https://questing.test/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "job_1" }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.data, { jobId: "job_1" });
});
