import type { Prisma } from "@prisma/client";

type PublicJobsQueryFilters = {
  category?: string | null;
  status?: string | null;
};

export function buildPublicJobsQuery({ category }: PublicJobsQueryFilters) {
  return {
    where: {
      status: "OPEN",
      ...(category && category !== "All" ? { category } : {}),
    },
    include: { poster: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  } as const satisfies Prisma.JobFindManyArgs;
}
