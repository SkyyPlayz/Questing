import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isLoginAllowed } from "../app/lib/userStatus";

test("ACTIVE users are allowed to log in", () => {
  assert.equal(isLoginAllowed("ACTIVE"), true);
});

test("PENDING_VERIFICATION users are denied login", () => {
  assert.equal(isLoginAllowed("PENDING_VERIFICATION"), false);
});

test("SUSPENDED users are denied login", () => {
  assert.equal(isLoginAllowed("SUSPENDED"), false);
});

test("BANNED users are denied login", () => {
  assert.equal(isLoginAllowed("BANNED"), false);
});

test("unknown/arbitrary status values are denied login", () => {
  assert.equal(isLoginAllowed("UNKNOWN"), false);
  assert.equal(isLoginAllowed(""), false);
});
