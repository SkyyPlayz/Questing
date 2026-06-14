export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type IncidentParticipantContext = {
  reporterId: string;
  reporterRole?: string | null;
  posterId: string;
  acceptedWorkerIds: string[];
  requestedSubjectUserId?: string | null;
};

export class IncidentAuthorizationError extends Error {}

export function inferIncidentSubjectUserId({
  reporterId,
  reporterRole,
  posterId,
  acceptedWorkerIds,
  requestedSubjectUserId,
}: IncidentParticipantContext): string | null {
  const participantIds = new Set([posterId, ...acceptedWorkerIds]);
  const isAdmin = reporterRole === "ADMIN";

  if (!isAdmin && !participantIds.has(reporterId)) {
    throw new IncidentAuthorizationError("Reporter is not a participant on this job");
  }

  if (requestedSubjectUserId) {
    if (!participantIds.has(requestedSubjectUserId)) {
      throw new Error("subjectUserId must belong to a job participant");
    }
    if (requestedSubjectUserId === reporterId) {
      throw new Error("subjectUserId cannot be the reporter");
    }
    return requestedSubjectUserId;
  }

  if (reporterId === posterId && acceptedWorkerIds.length === 1) {
    return acceptedWorkerIds[0];
  }

  if (acceptedWorkerIds.includes(reporterId)) {
    return posterId;
  }

  return null;
}

export function calculateRiskLevel(incidents: Array<{ severity: string }>): IncidentRiskLevel {
  const count = incidents.length;
  if (count >= 3 || incidents.some((incident) => incident.severity === "CRITICAL")) return "HIGH";
  if (count >= 1 || incidents.some((incident) => incident.severity === "HIGH")) return "MEDIUM";
  return "LOW";
}
