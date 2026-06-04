import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  REGISTRATION_ERROR_FALLBACK,
  getRegistrationErrorMessage,
} from "../app/lib/registration-error";

test("getRegistrationErrorMessage preserves API JSON error messages", async () => {
  const message = await getRegistrationErrorMessage(
    new Response(JSON.stringify({ error: "Email already in use" }), {
      status: 409,
      headers: { "content-type": "application/json" },
    }),
  );

  assert.equal(message, "Email already in use");
});

test("getRegistrationErrorMessage falls back for non-JSON API errors", async () => {
  const message = await getRegistrationErrorMessage(
    new Response("<html><body>Server error</body></html>", {
      status: 500,
      headers: { "content-type": "text/html" },
    }),
  );

  assert.equal(message, REGISTRATION_ERROR_FALLBACK);
});

test("getRegistrationErrorMessage falls back for empty API errors", async () => {
  const message = await getRegistrationErrorMessage(new Response("", { status: 502 }));

  assert.equal(message, REGISTRATION_ERROR_FALLBACK);
});

test("getRegistrationErrorMessage falls back for malformed JSON API errors", async () => {
  const message = await getRegistrationErrorMessage(
    new Response("{\"error\":", {
      status: 500,
      headers: { "content-type": "application/json" },
    }),
  );

  assert.equal(message, REGISTRATION_ERROR_FALLBACK);
});
