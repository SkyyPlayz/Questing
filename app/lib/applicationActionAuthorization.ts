export type ApplicationAction = "accept" | "reject" | "withdraw";

export function isApplicationAction(action: unknown): action is ApplicationAction {
  return action === "accept" || action === "reject" || action === "withdraw";
}

export function canManageApplicationAction({
  action,
  userId,
  userRole,
  jobPosterId,
  applicationWorkerId,
}: {
  action: ApplicationAction;
  userId: string;
  userRole: string;
  jobPosterId: string;
  applicationWorkerId: string;
}): boolean {
  if (action === "withdraw") {
    return applicationWorkerId === userId;
  }

  return jobPosterId === userId || userRole === "ADMIN";
}
