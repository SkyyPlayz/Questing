import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildRegistrationSuccessMessage } from "../app/lib/registrationResult";

test("registration success tells new users to verify their email before logging in", () => {
  const message = buildRegistrationSuccessMessage("new-user@example.com");

  assert.match(message, /new-user@example\.com/);
  assert.match(message, /verify/i);
  assert.match(message, /before signing in/i);
});
