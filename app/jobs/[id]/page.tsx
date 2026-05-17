import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/app/lib/auth";
import JobDetailClient from "./JobDetailClient";

type Params = { params: Promise<{ id: string }> };

export default async function JobDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      poster: { select: { id: true, name: true } },
      applications: {
        include: { worker: { select: { id: true, name: true, email: true } } },
      },
      jobCheckIns: {
        include: { worker: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!job) notFound();

  const userApplication = user
    ? job.applications.find((a) => a.workerId === user.id)
    : null;

  const isPoster = user?.id === job.posterId;

  return (
    <JobDetailClient
      job={JSON.parse(JSON.stringify(job))}
      userId={user?.id}
      userRole={user?.role}
      userApplication={userApplication ? JSON.parse(JSON.stringify(userApplication)) : null}
      isPoster={isPoster}
    />
  );
}
