import { strict as assert } from "node:assert";
import { test } from "node:test";
import { canAccountAuthenticate, getAccountStatusRejection } from "../app/lib/accountStatus";

test("only active users can authenticate", () => {
  assert.equal(canAccountAuthenticate("ACTIVE", new Date()), true);
  assert.equal(canAccountAuthenticate("ACTIVE", null), false);
  assert.equal(canAccountAuthenticate("PENDING_VERIFICATION"), false);
  assert.equal(canAccountAuthenticate("SUSPENDED"), false);
  assert.equal(canAccountAuthenticate("BANNED"), false);
});

test("inactive account states expose a clear generic rejection", () => {
  assert.equal(getAccountStatusRejection("PENDING_VERIFICATION"), "Your account is pending verification.");
  assert.equal(getAccountStatusRejection("SUSPENDED"), "Your account has been suspended.");
  assert.equal(getAccountStatusRejection("BANNED"), "Your account has been banned.");
  assert.equal(getAccountStatusRejection("ACTIVE", null), "Your email address is not verified.");
  assert.equal(getAccountStatusRejection(undefined), "Your account is not active.");
});
