/**
 * Determines the level of job detail a user is permitted to see.
 *
 * - "full"   – poster or admin: all fields including emails, applications,
 *              check-ins, and incident descriptions.
 * - "worker" – an accepted (or FCFS-accepted) worker on this specific job:
 *              check-ins and incidents for safety, but no other workers' emails.
 * - "public" – anonymous or an unrelated authenticated user: public job fields
 *              only (no emails, no applications, no check-ins, no incidents).
 */
export function getJobAccessLevel(
  userId: string | undefined,
  userRole: string | undefined,
  jobPosterId: string,
  acceptedWorkerIds: string[]
): "full" | "worker" | "public" {
  if (!userId) return "public";
  if (userId === jobPosterId || userRole === "ADMIN") return "full";
  if (acceptedWorkerIds.includes(userId)) return "worker";
  return "public";
}
