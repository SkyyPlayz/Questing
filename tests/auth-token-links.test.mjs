import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = {
  registration: readFileSync("app/api/users/route.ts", "utf8"),
  resendVerification: readFileSync("app/api/auth/verify-email/route.ts", "utf8"),
  forgotPassword: readFileSync("app/api/auth/forgot-password/route.ts", "utf8"),
  resetPassword: readFileSync("app/api/auth/reset-password/route.ts", "utf8"),
  credentialsAuth: readFileSync("app/lib/auth.ts", "utf8"),
  emailNormalization: readFileSync("app/lib/email-normalization.ts", "utf8"),
  tokenHelper: readFileSync("app/lib/auth-tokens.ts", "utf8"),
};

test("account lifecycle email links interpolate generated tokens", () => {
  for (const [name, source] of Object.entries(files)) {
    assert.doesNotMatch(source, /token=\*\*\*/, `${name} must not send placeholder tokens`);
  }

  assert.match(files.registration, /verify-email\?token=\$\{verifyToken\}/);
  assert.match(files.resendVerification, /verify-email\?token=\$\{token\}/);
  assert.match(files.forgotPassword, /reset-password\?token=\$\{token\}/);
});

test("account email identifiers are trimmed and lowercased before auth lookups", () => {
  assert.match(files.emailNormalization, /trim\(\)\.toLowerCase\(\)/);

  for (const [name, source] of Object.entries({
    registration: files.registration,
    resendVerification: files.resendVerification,
    forgotPassword: files.forgotPassword,
    resetPassword: files.resetPassword,
    credentialsAuth: files.credentialsAuth,
  })) {
    assert.match(source, /normalizeEmail\(/, `${name} must canonicalize inbound email`);
  }

  assert.match(files.registration, /data: \{ name, email: normalizedEmail,/);
  assert.match(files.registration, /replaceVerificationToken\(`verify:\$\{normalizedEmail\}`/);
  assert.match(files.registration, /encodeURIComponent\(normalizedEmail\)/);
  assert.match(files.credentialsAuth, /email: \{ equals: normalizedEmail, mode: "insensitive" \}/);

  for (const [name, source] of Object.entries({
    resendVerification: files.resendVerification,
    forgotPassword: files.forgotPassword,
    resetPassword: files.resetPassword,
  })) {
    assert.match(source, /`(verify|reset):\$\{normalizedEmail\}`/, `${name} token identifier must use normalized email`);
  }
});

test("account lifecycle tokens are replaced by identifier instead of fake upsert keys", () => {
  assert.match(files.tokenHelper, /verificationToken\.create\(\{ data: \{ identifier, token, expires \} \}\)/);
  assert.match(files.tokenHelper, /verificationToken\.deleteMany\(\{ where: \{ identifier, NOT: \{ token \} \} \}\)/);

  for (const [name, source] of Object.entries({
    registration: files.registration,
    resendVerification: files.resendVerification,
    forgotPassword: files.forgotPassword,
  })) {
    assert.match(source, /replaceVerificationToken\(/, `${name} must rotate the current token`);
    assert.doesNotMatch(source, /verificationToken\.upsert/, `${name} must not upsert through a stale token value`);
    assert.doesNotMatch(source, /token:\s*email/, `${name} must not use email as a placeholder token`);
  }
});
