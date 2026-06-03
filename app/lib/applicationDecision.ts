export type JobDecisionStatus =
  | "DRAFT"
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type ApplicationDecisionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "FCFS_ACCEPTED";

export function canDecideApplication({
  jobStatus,
  applicationStatus,
}: {
  jobStatus: JobDecisionStatus;
  applicationStatus: ApplicationDecisionStatus;
}) {
  return jobStatus === "OPEN" && applicationStatus === "PENDING";
}

export const APPLICATION_DECISION_ERROR =
  "Application decisions require an OPEN job and a PENDING application";
