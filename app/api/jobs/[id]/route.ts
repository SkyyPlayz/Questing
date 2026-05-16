import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { JobStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      poster: { select: { id: true, name: true, email: true } },
      applications: {
        include: { worker: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const user = session.user as { id: string; role: string };

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.posterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { status, title, description, category, location, payRate, payUnit, startDate, endDate } = body;

  // Validate status transitions
  const validTransitions: Record<JobStatus, JobStatus[]> = {
    DRAFT: ["OPEN", "CANCELLED"],
    OPEN: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED", "DISPUTED"],
    COMPLETED: [],
    CANCELLED: [],
    DISPUTED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  };

  if (status && status !== job.status) {
    if (!validTransitions[job.status].includes(status as JobStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${job.status} to ${status}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.job.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(category && { category }),
      ...(location && { location }),
      ...(payRate !== undefined && { payRate: parseFloat(payRate) }),
      ...(payUnit && { payUnit }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(status && { status: status as JobStatus }),
    },
  });

  return NextResponse.json(updated);
}
