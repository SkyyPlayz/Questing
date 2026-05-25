/**
 * Returns true only when the given UserStatus permits login.
 * Any status other than ACTIVE (e.g. PENDING_VERIFICATION, SUSPENDED, BANNED)
 * must be denied a session.
 */
export function isLoginAllowed(status: string): boolean {
  return status === "ACTIVE";
}
