export function canAccessChatThread(
  thread: { threadType: string; posterId: string; privateWorkerId?: string | null },
  userId?: string | null
): boolean;

export function canWorkerCreatePrivateThread(application?: { status?: string | null } | null): boolean;
