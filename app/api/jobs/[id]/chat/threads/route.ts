import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/app/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      chatThreads: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      applications: {
        select: { workerId: true, status: true },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Filter private threads: only poster and accepted workers can see them
  const acceptedWorkerIds = job.applications
    .filter((a) => a.status === "ACCEPTED" || a.status === "FCFS_ACCEPTED")
    .map((a) => a.workerId);

  const visibleThreads = job.chatThreads.filter((t) => {
    if (t.threadType === "PUBLIC_QA") return true;
    if (t.threadType === "PRIVATE") {
      return user?.id === job.posterId || acceptedWorkerIds.includes(user?.id ?? "");
    }
    return false;
  });

  return NextResponse.json({ threads: visibleThreads });
}
