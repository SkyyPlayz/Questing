import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/app/lib/auth";
import { sendEmail, emailNewChatMessage, BASE } from "@/app/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const { threadId } = await params;

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      job: { select: { id: true, posterId: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Access control: public QA open to all, private only poster + accepted workers
  const applications = await prisma.application.findMany({
    where: { jobId: thread.jobId },
    select: { workerId: true, status: true },
  });
  const acceptedWorkerIds = applications
    .filter((a) => a.status === "ACCEPTED" || a.status === "FCFS_ACCEPTED")
    .map((a) => a.workerId);

  if (thread.threadType === "PRIVATE") {
    const isPoster = user?.id === thread.job.posterId;
    const isAcceptedWorker = acceptedWorkerIds.includes(user?.id ?? "");
    if (!isPoster && !isAcceptedWorker) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  return NextResponse.json({
    threadId: thread.id,
    threadType: thread.threadType,
    messages: thread.messages,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const { threadId } = await params;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: { job: { select: { posterId: true, title: true } } },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Access control for posting
  if (thread.threadType === "PRIVATE") {
    const applications = await prisma.application.findMany({
      where: { jobId: thread.jobId },
      select: { workerId: true, status: true },
    });
    const acceptedWorkerIds = applications
      .filter((a) => a.status === "ACCEPTED" || a.status === "FCFS_ACCEPTED")
      .map((a) => a.workerId);
    const isPoster = user.id === thread.job.posterId;
    const isAcceptedWorker = acceptedWorkerIds.includes(user.id);
    if (!isPoster && !isAcceptedWorker) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  const message = await prisma.chatMessage.create({
    data: {
      threadId,
      senderId: user.id,
      content: content.trim(),
    },
    include: { sender: { select: { id: true, name: true, email: true } } },
  });

  // Update thread lastMessageAt
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { lastMessageAt: message.createdAt },
  });

  // Send chat notification to the other participant (skip if public QA)
  if (thread.threadType === "PRIVATE") {
    const sender = message.sender;
    const acceptedApps = await prisma.application.findMany({
      where: { jobId: thread.jobId, status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
      select: { workerId: true },
    });
    const recipient = user.id === thread.job.posterId && acceptedApps[0]
      ? await prisma.user.findUnique({ where: { id: acceptedApps[0].workerId }, select: { name: true, email: true } })
      : await prisma.user.findUnique({ where: { id: thread.job.posterId }, select: { name: true, email: true } });
    if (recipient) {
      await sendEmail({
        to: { email: recipient.email, name: recipient.name ?? undefined },
        ...emailNewChatMessage({
          senderName: sender.name ?? "a user",
          jobTitle: thread.job.title ?? "the job",
          recipientName: recipient.name ?? "the recipient",
        }),
      });
    }
  }

  return NextResponse.json({ message }, { status: 201 });
}
