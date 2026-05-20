import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { awardXP } from "@/app/lib/xp";

type Params = { params: Promise<{ id: string }> };

/**
 * Haversine formula — returns distance in meters between two lat/lng points.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (user.role !== "WORKER") {
    return NextResponse.json({ error: "Only workers can check in" }, { status: 403 });
  }

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { applications: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Job is not in progress" }, { status: 400 });
  }

  // Verify the worker is the FCFS-accepted applicant
  const acceptedApp = job.applications.find(
    (a) => a.status === "FCFS_ACCEPTED" || a.status === "ACCEPTED"
  );
  if (!acceptedApp || acceptedApp.workerId !== user.id) {
    return NextResponse.json({ error: "You are not the accepted worker for this job" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { latitude, longitude } = body;

  if (latitude == null || longitude == null) {
    return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // Compute distance against job location
  let distanceM: number | null = null;
  let verified = false;
  let outOfRange = false;

  if (job.locationLat != null && job.locationLng != null) {
    distanceM = haversineDistance(job.locationLat, job.locationLng, latitude, longitude);
    const RANGE_METERS = 500; // 500m tolerance
    outOfRange = distanceM > RANGE_METERS;
    verified = !outOfRange;
  } else {
    // Job has no lat/lng — check-in recorded but not GPS-verified
    verified = false;
    outOfRange = false;
  }

  // Record firstCheckInAt on the application if this is the worker's first check-in
  const existingCheckIns = await prisma.jobCheckIn.count({ where: { applicationId: acceptedApp.id } });
  if (existingCheckIns === 0) {
    await prisma.application.update({
      where: { id: acceptedApp.id },
      data: { firstCheckInAt: new Date() },
    });
  }

  // If out of range, flag it as a safety incident for the poster to review
  let outOfRangeIncident = null;
  if (outOfRange) {
    outOfRangeIncident = await prisma.safetyIncident.create({
      data: {
        jobId: id,
        reporterId: user.id,
        severity: "LOW",
        description: `Worker check-in out of range: ${distanceM?.toFixed(0)}m from job location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
        status: "OPEN",
        riskLevel: "MEDIUM",
      },
    });
  }

  const checkIn = await prisma.jobCheckIn.create({
    data: {
      jobId: id,
      workerId: user.id,
      applicationId: acceptedApp.id,
      latitude,
      longitude,
      verified,
      distanceM,
    },
  });

  const totalCheckIns = existingCheckIns + 1;

  let xpResult = null;
  if (verified) {
    xpResult = await awardXP(user.id, "STAGE_COMPLETED", id);
  }

  let message = "";
  if (verified) {
    message = `Check-in verified — you are within ${distanceM?.toFixed(0)}m of the job location. +${xpResult?.xpAwarded} XP`;
  } else if (outOfRange) {
    message = `⚠️ Check-in flagged — you are ${distanceM?.toFixed(0)}m from the job location (outside 500m range). An incident has been created for the poster to review.`;
  } else {
    message = "Check-in recorded — job has no GPS coordinates, so verification is not available.";
  }

  return NextResponse.json({
    ...checkIn,
    verified,
    outOfRange,
    distanceM,
    rangeMeters: 500,
    totalCheckIns,
    firstCheckInAt: existingCheckIns === 0 ? new Date() : null,
    outOfRangeIncident: outOfRangeIncident ? { id: outOfRangeIncident.id, description: outOfRangeIncident.description } : null,
    xp: xpResult,
    message,
  }, { status: 201 });
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const checkIns = await prisma.jobCheckIn.findMany({
    where: { jobId: id },
    include: {
      worker: { select: { id: true, name: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json(checkIns);
}
