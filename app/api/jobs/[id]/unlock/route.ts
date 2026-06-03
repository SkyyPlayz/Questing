import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * FCFS Timeout Unlock — poster/admin can unlock a job if the FCFS-accepted
 * worker hasn't checked in within the configured timeout window.
 * This reopens the job so pending applicants can be considered.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      applications: {
        include: { worker: { select: { id: true, name: true } } },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.posterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only applicable for FCFS-locked jobs
  if (!job.fcfsMode) {
    return NextResponse.json({ error: "Unlock not applicable — job uses poster-review mode" }, { status: 400 });
  }

  if (job.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Job is not in progress" }, { status: 400 });
  }

  const fcfsApp = job.applications.find((a) => a.status === "FCFS_ACCEPTED");
  if (!fcfsApp) {
    return NextResponse.json({ error: "No FCFS-accepted applicant found" }, { status: 400 });
  }

  // Check timeout: has the worker checked in within the timeout window?
  const timeoutMinutes = job.fcfsTimeoutMinutes ?? 30;
  const acceptedAt = fcfsApp.acceptedAt;
  if (!acceptedAt) {
    return NextResponse.json({ error: "Accepted timestamp not recorded" }, { status: 400 });
  }

  const elapsedMinutes = (Date.now() - acceptedAt.getTime()) / (1000 * 60);
  const hasCheckedIn = fcfsApp.firstCheckInAt != null;

  if (hasCheckedIn) {
    return NextResponse.json({
      error: "Worker has already checked in — job cannot be unlocked",
      hasCheckedIn: true,
      firstCheckInAt: fcfsApp.firstCheckInAt,
    }, { status: 400 });
  }

  if (elapsedMinutes < timeoutMinutes) {
    return NextResponse.json({
      error: "FCFS timeout not expired yet",
      elapsedMinutes: Math.round(elapsedMinutes),
      timeoutMinutes,
      remainingMinutes: Math.round(timeoutMinutes - elapsedMinutes),
    }, { status: 400 });
  }

  const pendingAppsPreserved = job.applications.filter((a) => a.status === "PENDING").length;

  // Unlock the job:
  // 1. Reject only the expired FCFS application
  // 2. Preserve pending applications so the poster can consider the queue
  // 3. Reopen the job and clear the FCFS lock state
  await prisma.$transaction([
    prisma.application.update({
      where: { id: fcfsApp.id },
      data: { status: "REJECTED" },
    }),
    prisma.job.update({
      where: { id },
      data: { status: "OPEN", fcfsLockedAt: null },
    }),
  ]);

  return NextResponse.json({
    unlocked: true,
    jobStatus: "OPEN",
    fcfsAppRejected: fcfsApp.id,
    pendingAppsPreserved,
    timeoutMinutes,
    elapsedMinutes: Math.round(elapsedMinutes),
  }, { status: 200 });
}
