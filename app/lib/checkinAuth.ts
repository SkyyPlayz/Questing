/**
 * Determines whether a user is authorised to view check-in records for a job.
 *
 * Allowed callers:
 *  - The job poster
 *  - Any accepted (ACCEPTED or FCFS_ACCEPTED) worker for the job
 *  - Any ADMIN user
 */
export function canViewCheckIns(
  userId: string,
  userRole: string,
  job: { posterId: string; applications: { workerId: string }[] },
): boolean {
  if (userRole === "ADMIN") return true;
  if (job.posterId === userId) return true;
  if (job.applications.some((a) => a.workerId === userId)) return true;
  return false;
}
