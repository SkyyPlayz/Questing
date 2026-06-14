import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { IncidentAuthorizationError, inferIncidentSubjectUserId } from "@/app/lib/safetyIncident";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const { jobId, severity, description, subjectUserId } = await req.json();
  if (!jobId || !severity || !description) {
    return NextResponse.json({ error: "jobId, severity, and description required" }, { status: 400 });
  }

  const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: "severity must be LOW, MEDIUM, HIGH, or CRITICAL" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      posterId: true,
      applications: {
        where: { status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
        select: { workerId: true },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let inferredSubjectUserId: string | null;
  try {
    inferredSubjectUserId = inferIncidentSubjectUserId({
      reporterId: user.id,
      reporterRole: user.role,
      posterId: job.posterId,
      acceptedWorkerIds: job.applications.map((application) => application.workerId),
      requestedSubjectUserId: subjectUserId,
    });
  } catch (error) {
    if (error instanceof IncidentAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid incident subject" }, { status: 400 });
  }

  if (!inferredSubjectUserId) {
    return NextResponse.json({ error: "subjectUserId required when unsafe party cannot be inferred" }, { status: 400 });
  }

  const incident = await prisma.safetyIncident.create({
    data: { jobId, reporterId: user.id, subjectUserId: inferredSubjectUserId, severity, description },
  });

  return NextResponse.json(incident, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const incidents = await prisma.safetyIncident.findMany({
    include: {
      job: { select: { id: true, title: true } },
      reporter: { select: { id: true, name: true, email: true } },
      subject: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(incidents);
}
