/**
 * Shared token-validation helpers used by the verify-email and reset-password
 * routes.  Extracted as pure functions so they can be unit-tested without a
 * real database connection.
 */

export type TokenRecord = {
  expires: Date;
};

/**
 * Returns true when a VerificationToken record exists and has not yet expired.
 * Returns false for a missing record (e.g. when a redacted / invalid token was
 * submitted and the DB lookup returned null) or for an expired record.
 *
 * @param record  The Prisma VerificationToken row, or null if not found.
 * @param now     Reference time; defaults to the current instant.
 */
export function isTokenValid(
  record: TokenRecord | null,
  now: Date = new Date(),
): boolean {
  return record !== null && record.expires >= now;
}
