import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getJobAccessLevel } from "../app/lib/jobVisibility";

test("anonymous user gets public access", () => {
  assert.equal(getJobAccessLevel(undefined, undefined, "poster1", []), "public");
});

test("authenticated unrelated user gets public access", () => {
  assert.equal(getJobAccessLevel("user1", "WORKER", "poster1", []), "public");
});

test("poster gets full access", () => {
  assert.equal(getJobAccessLevel("poster1", "POSTER", "poster1", []), "full");
});

test("admin gets full access regardless of poster relationship", () => {
  assert.equal(getJobAccessLevel("admin1", "ADMIN", "poster1", []), "full");
});

test("admin who is also accepted worker still gets full access", () => {
  assert.equal(getJobAccessLevel("admin1", "ADMIN", "poster1", ["admin1"]), "full");
});

test("accepted worker gets worker-level access", () => {
  assert.equal(getJobAccessLevel("worker1", "WORKER", "poster1", ["worker1", "worker2"]), "worker");
});

test("non-accepted worker gets public access", () => {
  assert.equal(getJobAccessLevel("worker3", "WORKER", "poster1", ["worker1", "worker2"]), "public");
});

test("empty accepted worker list gives public access to authenticated worker", () => {
  assert.equal(getJobAccessLevel("worker1", "WORKER", "poster1", []), "public");
});
