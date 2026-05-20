import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { JobStatus } from "@prisma/client";
import { awardXP } from "@/app/lib/xp";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function updateReliabilityScore(workerId: string) {
  const [accepted, completed] = await Promise.all([
    prisma.application.count({
      where: { workerId, status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
    }),
    prisma.application.count({
      where: { workerId, status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] }, job: { status: "COMPLETED" } },
    }),
  ]);
  const reliabilityPct = accepted > 0 ? completed / accepted : 0;
  await prisma.competencyScore.upsert({
    where: { userId: workerId },
    update: { jobsCompleted: completed, reliabilityPct, updatedAt: new Date() },
    create: { userId: workerId, jobsCompleted: completed, reliabilityPct, updatedAt: new Date() },
  });
}

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
      jobCheckIns: {
        include: { worker: { select: { id: true, name: true } } },
        orderBy: { timestamp: "desc" },
      },
      incidents: {
        where: { status: "OPEN" },
        select: { id: true, severity: true, description: true, createdAt: true },
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
    include: { payment: true },
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

  // Auto-create PUBLIC_QA chat thread when job is published (DRAFT -> OPEN)
  if (status === "OPEN" && job.status === "DRAFT") {
    await prisma.chatThread.create({
      data: { jobId: id, threadType: "PUBLIC_QA" },
    });
  }

  // Award QUEST_COMPLETED XP to worker when job is marked COMPLETED (no-payment path)
  if (status === "COMPLETED" && job.status !== "COMPLETED" && !updated.payment?.stripePaymentIntentId) {
    const acceptedApp = await prisma.application.findFirst({
      where: { jobId: id, status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
    });
    if (acceptedApp) {
      await awardXP(acceptedApp.workerId, "QUEST_COMPLETED", id);
      await updateReliabilityScore(acceptedApp.workerId);
    }
  }

  if (status && status !== job.status && updated.payment?.stripePaymentIntentId) {
    const pi = updated.payment.stripePaymentIntentId;
    if (status === "COMPLETED" && updated.payment.status === "HELD") {
      // Calculate platform fee from admin-configurable rate
      const feeConfig = await prisma.adminConfig.findUnique({ where: { key: "PLATFORM_FEE_PERCENT" } });
      const feePercent = feeConfig ? parseFloat(feeConfig.value) || 0.10 : 0.10;
      const platformFeeCents = Math.round(updated.payment.amount * feePercent);

      await stripe.paymentIntents.capture(pi);
      await prisma.payment.update({ where: { id: updated.payment.id }, data: { status: "RELEASED" } });

      // Award QUEST_COMPLETED XP to the accepted worker
      const acceptedApp = await prisma.application.findFirst({
        where: { jobId: id, status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
      });
      if (acceptedApp) {
        await awardXP(acceptedApp.workerId, "QUEST_COMPLETED", id);
        await updateReliabilityScore(acceptedApp.workerId);
      }

      // Record the platform fee
      await prisma.platformFee.create({
        data: {
          jobId: updated.id,
          amount: platformFeeCents,
          type: "PLATFORM_SERVICE",
          percent: feePercent,
          status: "RELEASED",
        },
      });
    } else if (status === "CANCELLED" && updated.payment.status === "HELD") {
      await stripe.paymentIntents.cancel(pi);
      await prisma.payment.update({ where: { id: updated.payment.id }, data: { status: "VOIDED" } });

      // Void any pending platform fee for this job
      await prisma.platformFee.updateMany({
        where: { jobId: updated.id, status: "PENDING" },
        data: { status: "VOIDED" },
      });
    }
  }

  return NextResponse.json(updated);
}
