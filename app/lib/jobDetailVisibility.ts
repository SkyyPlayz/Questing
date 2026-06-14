import type { Prisma } from "@prisma/client";

export type JobDetailViewer = { id?: string; role?: string } | null | undefined;

export function buildJobDetailJobQuery(id: string): Prisma.JobFindUniqueArgs {
  return {
    where: { id },
    include: { poster: { select: { id: true, name: true } } },
  };
}

export function canViewJobApplications(
  job: { posterId: string },
  viewer: JobDetailViewer,
) {
  return Boolean(viewer?.id && (viewer.id === job.posterId || viewer.role === "ADMIN"));
}

export function buildJobDetailApplicationsQuery(
  jobId: string,
  viewer: JobDetailViewer,
  canViewApplications: boolean,
): Prisma.ApplicationFindManyArgs | null {
  if (canViewApplications) {
    return {
      where: { jobId },
      include: { worker: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    };
  }

  if (!viewer?.id) return null;

  return {
    where: { jobId, workerId: viewer.id },
    select: { id: true, workerId: true, status: true },
    orderBy: { createdAt: "asc" },
  };
}
