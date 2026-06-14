import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { RiskLevel } from "@prisma/client";
import { calculateRiskLevel, inferIncidentSubjectUserId } from "@/app/lib/safetyIncident";

type Params = { params: Promise<{ id: string }> };

async function recomputeRiskScore(userId: string) {
  const incidents = await prisma.safetyIncident.findMany({
    where: { subjectUserId: userId, status: "RESOLVED" },
  });
  const count = incidents.length;
  const riskLevel = calculateRiskLevel(incidents) as RiskLevel;

  await prisma.riskScore.upsert({
    where: { userId },
    create: { userId, riskLevel, incidentCount: count },
    update: { riskLevel, incidentCount: count },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { action, resolution } = await req.json();

  if (!["resolve", "dismiss"].includes(action)) {
    return NextResponse.json({ error: "action must be resolve or dismiss" }, { status: 400 });
  }

  const incident = await prisma.safetyIncident.findUnique({
    where: { id },
    include: {
      job: {
        select: {
          posterId: true,
          applications: {
            where: { status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
            select: { workerId: true },
          },
        },
      },
    },
  });
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let subjectUserId = incident.subjectUserId;
  if (!subjectUserId) {
    try {
      subjectUserId = inferIncidentSubjectUserId({
        reporterId: incident.reporterId,
        posterId: incident.job.posterId,
        acceptedWorkerIds: incident.job.applications.map((application) => application.workerId),
      });
    } catch {
      subjectUserId = null;
    }
  }

  if (action === "resolve" && !subjectUserId) {
    return NextResponse.json({ error: "subjectUserId required before resolving this incident" }, { status: 400 });
  }

  const updated = await prisma.safetyIncident.update({
    where: { id },
    data: {
      status: action === "resolve" ? "RESOLVED" : "DISMISSED",
      resolution: resolution || null,
      subjectUserId,
    },
  });

  if (subjectUserId) {
    await recomputeRiskScore(subjectUserId);
  }

  return NextResponse.json(updated);
}
