import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const { id: jobId } = await params;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { applications: { where: { status: "ACCEPTED" } } },
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

  return NextResponse.json(dispute, { status: 201 });
}
