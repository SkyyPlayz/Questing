import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string };

  const { id: jobId } = await params;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      applications: { where: { status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } } },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isParticipant =
    job.posterId === user.id ||
    job.applications.some((a) => a.workerId === user.id);
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (job.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "SOS only available on active jobs" }, { status: 400 });
  }

  // Get worker profile for emergency contact
  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: user.id },
    select: { emergencyContact: true, emergencyContactPhone: true },
  });

  // Log high-severity SafetyIncident
  const [incident] = await prisma.$transaction([
    prisma.safetyIncident.create({
      data: {
        jobId,
        reporterId: user.id,
        severity: "HIGH",
        description: "SOS emergency trigger by worker",
        status: "OPEN",
        riskLevel: "HIGH",
      },
    }),
    prisma.job.update({
      where: { id: jobId },
      data: { status: "DISPUTED" }, // Flag job for admin review
    }),
  ]);

  return NextResponse.json({
    incidentId: incident.id,
    emergencyContact: workerProfile?.emergencyContact || null,
    emergencyContactPhone: workerProfile?.emergencyContactPhone || null,
    adminContact: "admin@jobquest.local",
    message: "Emergency logged. Admin and emergency contact will be notified.",
  }, { status: 200 });
}
