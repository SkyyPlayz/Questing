export const JOB_STATUSES = new Set([
  "DRAFT",
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
] as const);

export type ValidJobStatus = "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";

export function isValidJobStatus(value: string): value is ValidJobStatus {
  return JOB_STATUSES.has(value as ValidJobStatus);
}
