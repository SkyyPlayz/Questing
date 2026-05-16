import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (user.role !== "WORKER") {
    return NextResponse.json({ error: "Only workers can apply" }, { status: 403 });
  }

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "OPEN") {
    return NextResponse.json({ error: "Job is not open for applications" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { message } = body;

  const existing = await prisma.application.findUnique({
    where: { jobId_workerId: { jobId: id, workerId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already applied" }, { status: 409 });
  }

  const application = await prisma.application.create({
    data: { jobId: id, workerId: user.id, message: message || null },
  });

  return NextResponse.json(application, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };

  const { id } = await params;
  const body = await req.json();
  const { applicationId, action } = body;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.posterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!application || application.jobId !== id) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (action === "accept") {
    // Accept this applicant, reject others, move job to IN_PROGRESS
    await prisma.$transaction([
      prisma.application.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED" },
      }),
      prisma.application.updateMany({
        where: { jobId: id, id: { not: applicationId } },
        data: { status: "REJECTED" },
      }),
      prisma.job.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      }),
    ]);
  } else if (action === "reject") {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: "REJECTED" },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updatedJob = await prisma.job.findUnique({
    where: { id },
    include: {
      applications: {
        include: { worker: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(updatedJob);
}
