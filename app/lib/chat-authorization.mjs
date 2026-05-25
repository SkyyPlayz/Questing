export function canAccessChatThread({ threadType, posterId, privateWorkerId }, userId) {
  if (threadType === "PUBLIC_QA") return true;
  if (threadType !== "PRIVATE" || !userId) return false;
  return userId === posterId || userId === privateWorkerId;
}

export function canWorkerCreatePrivateThread(application) {
  return application?.status === "ACCEPTED" || application?.status === "FCFS_ACCEPTED";
}
