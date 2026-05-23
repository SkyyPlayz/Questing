import type { Prisma } from "@prisma/client";

export function buildActiveWorkerApplicationsQuery(workerId: string) {
  return {
    where: {
      workerId,
      status: "ACCEPTED",
      job: { status: "IN_PROGRESS" },
    },
    include: {
      job: {
        include: { poster: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  } as const satisfies Prisma.ApplicationFindManyArgs;
}
