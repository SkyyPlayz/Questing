import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { sendEmail, emailDisputeOpened } from "@/app/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const { id: jobId } = await params;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      applications: { where: { status: "ACCEPTED" }, include: { worker: { select: { id: true, name: true, email: true } } } },
      poster: { select: { id: true, name: true, email: true } },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isParticipant =
    job.posterId === user.id || job.applications.some((a) => a.workerId === user.id);
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!["IN_PROGRESS", "COMPLETED"].includes(job.status)) {
    return NextResponse.json({ error: "Can only dispute IN_PROGRESS or COMPLETED jobs" }, { status: 400 });
  }

  const openDispute = await prisma.dispute.findFirst({ where: { jobId, status: "OPEN" } });
  if (openDispute) return NextResponse.json({ error: "Open dispute already exists" }, { status: 409 });

  const [dispute] = await prisma.$transaction([
    prisma.dispute.create({ data: { jobId, raisedById: user.id } }),
    prisma.job.update({ where: { id: jobId }, data: { status: "DISPUTED" } }),
  ]);

  // Notify the other party (recipient) about the dispute
  const acceptedApp = job.applications.find((a) => a.status === "ACCEPTED");
  const raiser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  });
  let recipient: { name: string | null; email: string } | null = null;
  if (job.posterId === user.id && acceptedApp) {
    recipient = await prisma.user.findUnique({
      where: { id: acceptedApp.workerId },
      select: { name: true, email: true },
    });
  } else if (acceptedApp && acceptedApp.workerId === user.id) {
    recipient = await prisma.user.findUnique({
      where: { id: job.posterId },
      select: { name: true, email: true },
    });
  }
  if (recipient?.email && raiser?.name) {
    await sendEmail({
      to: { email: recipient.email, name: recipient.name ?? undefined },
      ...emailDisputeOpened({
        raiserName: raiser.name,
        jobTitle: job.title,
        recipientName: recipient.name ?? "Recipient",
      }),
    });
  }

  return NextResponse.json(dispute, { status: 201 });
}
