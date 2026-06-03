import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getMissingServerEnv, ServerSetupError, assertServerEnv } from "../app/lib/env";

test("server env diagnostics report required local bootstrap variables", () => {
  const missing = getMissingServerEnv({});

  assert.deepEqual(
    missing.map((envVar) => envVar.name),
    ["DATABASE_URL", "NEXTAUTH_SECRET"],
  );
});

test("server env diagnostics accept populated required variables", () => {
  const missing = getMissingServerEnv({
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/questing",
    NEXTAUTH_SECRET: "development-secret",
  });

  assert.deepEqual(missing, []);
});

test("assertServerEnv throws an actionable setup error", () => {
  assert.throws(
    () => assertServerEnv({ DATABASE_URL: "", NEXTAUTH_SECRET: "" }),
    (error) => {
      assert.ok(error instanceof ServerSetupError);
      assert.equal(error.missingEnv.length, 2);
      assert.match(error.message, /DATABASE_URL/);
      assert.match(error.message, /NEXTAUTH_SECRET/);
      return true;
    },
  );
});
