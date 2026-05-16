import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const { jobId, severity, description } = await req.json();
  if (!jobId || !severity || !description) {
    return NextResponse.json({ error: "jobId, severity, and description required" }, { status: 400 });
  }

  const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: "severity must be LOW, MEDIUM, HIGH, or CRITICAL" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const incident = await prisma.safetyIncident.create({
    data: { jobId, reporterId: user.id, severity, description },
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
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(incidents);
}
