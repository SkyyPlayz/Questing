export const ACCEPTED_APPLICATION_STATUSES = ["ACCEPTED", "FCFS_ACCEPTED"] as const;

export function acceptedApplicationStatusWhere() {
  return { in: [...ACCEPTED_APPLICATION_STATUSES] };
}

export function acceptedApplicationForWorkerWhere(workerId: string) {
  return {
    workerId,
    status: acceptedApplicationStatusWhere(),
  };
}
