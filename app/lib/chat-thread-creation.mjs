function threadLookup({ jobId, threadType, workerId }) {
  const where = { jobId, threadType };
  if (threadType === "PRIVATE") where.privateWorkerId = workerId;
  return where;
}

export function isUniqueConstraintError(error) {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error.code === "P2002" || error.code === "23505")
  );
}

export async function findExistingChatThread(prisma, scope, include) {
  return prisma.chatThread.findFirst({
    where: threadLookup(scope),
    ...(include ? { include } : {}),
    orderBy: { createdAt: "asc" },
  });
}

export async function createChatThreadIdempotently(prisma, scope, include) {
  const existing = await findExistingChatThread(prisma, scope, include);
  if (existing) return { thread: existing, created: false };

  try {
    const thread = await prisma.chatThread.create({
      data: {
        jobId: scope.jobId,
        threadType: scope.threadType,
        privateWorkerId: scope.threadType === "PRIVATE" ? scope.workerId : null,
      },
      ...(include ? { include } : {}),
    });
    return { thread, created: true };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const racedExisting = await findExistingChatThread(prisma, scope, include);
    if (racedExisting) return { thread: racedExisting, created: false };
    throw error;
  }
}
