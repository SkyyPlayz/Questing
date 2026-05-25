import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isTokenValid } from "../app/lib/authTokens";

// ── isTokenValid — success path ──────────────────────────────────────────────

test("valid token (not yet expired) passes verification", () => {
  const record = { expires: new Date(Date.now() + 60_000) }; // 1 minute from now
  assert.equal(isTokenValid(record), true);
});

test("token expiring exactly at the reference instant is still valid", () => {
  const now = new Date();
  const record = { expires: now };
  assert.equal(isTokenValid(record, now), true);
});

// ── isTokenValid — invalid-token paths ───────────────────────────────────────

test("null record (e.g. redacted or unknown token submitted) fails verification", () => {
  // When the DB lookup returns null — which happens when the email contains a
  // redacted placeholder like token=*** or any token value that was never
  // stored — isTokenValid must return false so the route rejects the request.
  assert.equal(isTokenValid(null), false);
});

test("expired token fails verification", () => {
  const record = { expires: new Date(Date.now() - 1) }; // 1 ms in the past
  assert.equal(isTokenValid(record), false);
});

test("token expired well in the past still fails verification", () => {
  const record = { expires: new Date(Date.now() - 1000 * 60 * 60 * 24) }; // 24 h ago
  assert.equal(isTokenValid(record), false);
});
