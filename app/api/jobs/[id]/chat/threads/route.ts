import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/app/lib/auth";
import { parseJsonBody } from "@/app/lib/api-json";
import { canAccessChatThread, canWorkerCreatePrivateThread } from "@/app/lib/chat-authorization.mjs";
import { createChatThreadIdempotently } from "@/app/lib/chat-thread-creation.mjs";

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
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const visibleThreads = job.chatThreads.filter((t) => {
    return canAccessChatThread(
      { threadType: t.threadType, posterId: job.posterId, privateWorkerId: t.privateWorkerId },
      user?.id
    );
  });

  return NextResponse.json({ threads: visibleThreads });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const { id } = await params;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const { threadType, workerId } = body;

  if (!threadType || !["PUBLIC_QA", "PRIVATE"].includes(threadType)) {
    return NextResponse.json(
      { error: "Invalid threadType. Must be PUBLIC_QA or PRIVATE" },
      { status: 400 }
    );
  }

  const job = await prisma.job.findUnique({
    where: { id },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Only the poster can create threads
  if (user.id !== job.posterId) {
    return NextResponse.json({ error: "Only the job poster can create chat threads" }, { status: 403 });
  }

  // Job must be OPEN to create threads
  if (job.status !== "OPEN" && job.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Threads can only be created on OPEN or IN_PROGRESS jobs" },
      { status: 400 }
    );
  }

  // For PRIVATE threads, workerId is required
  if (threadType === "PRIVATE") {
    if (!workerId) {
      return NextResponse.json({ error: "workerId required for PRIVATE threads" }, { status: 400 });
    }

    // Verify worker has an accepted application on this job
    const application = await prisma.application.findUnique({
      where: { jobId_workerId: { jobId: id, workerId } },
    });
    if (!application) {
      return NextResponse.json(
        { error: "Worker has no application on this job" },
        { status: 400 }
      );
    }
    if (!canWorkerCreatePrivateThread(application)) {
      return NextResponse.json(
        { error: "Worker must be ACCEPTED or FCFS_ACCEPTED to have a private thread" },
        { status: 400 }
      );
    }
  }

  const { thread, created } = await createChatThreadIdempotently(
    prisma,
    {
      jobId: id,
      threadType,
      workerId,
    },
    {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    }
  );

  return NextResponse.json({ thread }, { status: created ? 201 : 200 });
}
