import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/app/lib/auth";
import {
  buildJobDetailApplicationsQuery,
  buildJobDetailJobQuery,
  canViewJobApplications,
} from "@/app/lib/jobDetailVisibility";
import JobDetailClient from "./JobDetailClient";

type Params = { params: Promise<{ id: string }> };

export default async function JobDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  const job = await prisma.job.findUnique(buildJobDetailJobQuery(id));

  if (!job) notFound();

  const applicationsQuery = buildJobDetailApplicationsQuery(
    id,
    user,
    canViewJobApplications(job, user),
  );
  const applications = applicationsQuery
    ? await prisma.application.findMany(applicationsQuery)
    : [];
  const jobDetail = { ...job, applications };

  const userApplication = user
    ? applications.find((application) => application.workerId === user.id)
    : null;

  const isPoster = user?.id === job.posterId;

  return (
    <JobDetailClient
      job={JSON.parse(JSON.stringify(jobDetail))}
      userId={user?.id}
      userRole={user?.role}
      userApplication={userApplication ? JSON.parse(JSON.stringify(userApplication)) : null}
      isPoster={isPoster}
    />
  );
}
