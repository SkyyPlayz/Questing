type IncidentAccessInput = {
  userId: string;
  userRole?: string | null;
  posterId: string;
  acceptedWorkerIds: string[];
};

export function canReportIncident({
  userId,
  userRole,
  posterId,
  acceptedWorkerIds,
}: IncidentAccessInput): boolean {
  return userRole === "ADMIN" || posterId === userId || acceptedWorkerIds.includes(userId);
}
