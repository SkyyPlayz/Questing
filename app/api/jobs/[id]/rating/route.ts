import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { acceptedApplicationStatusWhere } from "@/app/lib/acceptedApplicationStatuses";
import { awardXP } from "@/app/lib/xp";

type Params = { params: Promise<{ id: string }> };

async function recomputeCompetency(userId: string) {
  const ratings = await prisma.rating.findMany({ where: { toUserId: userId } });
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0;

  const jobs = await prisma.job.findMany({
    where: { applications: { some: { workerId: userId, status: acceptedApplicationStatusWhere() } } },
    select: { status: true },
  });
  const completed = jobs.filter((j) => j.status === "COMPLETED").length;
  const abandoned = jobs.filter((j) => j.status === "CANCELLED").length;
  const total = completed + abandoned;
  const reliabilityPct = total > 0 ? (completed / total) * 100 : 100;
  const overallScore = avgRating * 0.5 + Math.min(completed / 10, 1) * 30 + (reliabilityPct / 100) * 20;

  await prisma.competencyScore.upsert({
    where: { userId },
    create: { userId, avgRating, jobsCompleted: completed, reliabilityPct, overallScore },
    update: { avgRating, jobsCompleted: completed, reliabilityPct, overallScore },
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const { id: jobId } = await params;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { applications: { where: { status: acceptedApplicationStatusWhere() } } },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "COMPLETED") {
    return NextResponse.json({ error: "Can only rate completed jobs" }, { status: 400 });
  }

  const isWorker = job.applications.some((a) => a.workerId === user.id);
  const isPoster = job.posterId === user.id;
  if (!isWorker && !isPoster) {
    return NextResponse.json({ error: "Not a participant on this job" }, { status: 403 });
  }

  const { score, comment } = await req.json();
  if (!score || score < 1 || score > 5) {
    return NextResponse.json({ error: "score must be 1–5" }, { status: 400 });
  }

  // Determine who is being rated
  const toUserId = isPoster
    ? job.applications[0]?.workerId
    : job.posterId;

  if (!toUserId) return NextResponse.json({ error: "No counterpart to rate" }, { status: 400 });

  const existing = await prisma.rating.findUnique({
    where: { jobId_fromUserId: { jobId, fromUserId: user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already rated" }, { status: 409 });

  const rating = await prisma.rating.create({
    data: { jobId, fromUserId: user.id, toUserId, score, comment: comment || null },
  });

  await recomputeCompetency(toUserId);

  if (score === 5) {
    await awardXP(toUserId, "RATING_RECEIVED_5_STAR", jobId);
  }

  return NextResponse.json(rating, { status: 201 });
}
