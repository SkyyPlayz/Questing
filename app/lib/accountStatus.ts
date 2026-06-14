export type AccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "BANNED";

const inactiveStatusMessages: Record<Exclude<AccountStatus, "ACTIVE">, string> = {
  PENDING_VERIFICATION: "Your account is pending verification.",
  SUSPENDED: "Your account has been suspended.",
  BANNED: "Your account has been banned.",
};

export function getAccountStatusRejection(
  status: AccountStatus | null | undefined,
  emailVerified?: Date | string | null
) {
  if (status === "ACTIVE" && emailVerified) return null;
  if (status && status in inactiveStatusMessages) {
    return inactiveStatusMessages[status as Exclude<AccountStatus, "ACTIVE">];
  }
  if (status === "ACTIVE") return "Your email address is not verified.";
  return "Your account is not active.";
}

export function canAccountAuthenticate(
  status: AccountStatus | null | undefined,
  emailVerified?: Date | string | null
) {
  return getAccountStatusRejection(status, emailVerified) === null;
}
