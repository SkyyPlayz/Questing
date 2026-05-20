import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { DisputeOutcome } from "@prisma/client";
import { sendEmail, emailDisputeResolved } from "@/app/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { outcome, adminNote } = await req.json();

  const validOutcomes: DisputeOutcome[] = ["WORKER_FAVOR", "POSTER_FAVOR", "SPLIT", "DISMISSED"];
  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { job: { include: { payment: true } } },
  });
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payment = dispute.job.payment;

  // Trigger payment action based on outcome
  if (payment?.stripePaymentIntentId && payment.status === "HELD") {
    if (outcome === "WORKER_FAVOR" || outcome === "POSTER_FAVOR") {
      await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "RELEASED" } });

      // Record platform fee (full amount) — only if one doesn't already exist
      const feeConfig = await prisma.adminConfig.findUnique({ where: { key: "PLATFORM_FEE_PERCENT" } });
      const feePercent = feeConfig ? parseFloat(feeConfig.value) || 0.10 : 0.10;
      const platformFeeCents = Math.round(payment.amount * feePercent);
      const existingFee = await prisma.platformFee.findUnique({ where: { jobId: dispute.jobId } });
      if (!existingFee) {
        await prisma.platformFee.create({
          data: {
            jobId: dispute.jobId,
            amount: platformFeeCents,
            type: "PLATFORM_SERVICE",
            percent: feePercent,
            status: "RELEASED",
          },
        });
      }
    } else if (outcome === "SPLIT") {
      const half = Math.floor(payment.amount / 2);
      await stripe.paymentIntents.capture(payment.stripePaymentIntentId, { amount_to_capture: half });
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "RELEASED" } });

      // Record platform fee (half amount) — only if one doesn't already exist
      const feeConfig = await prisma.adminConfig.findUnique({ where: { key: "PLATFORM_FEE_PERCENT" } });
      const feePercent = feeConfig ? parseFloat(feeConfig.value) || 0.10 : 0.10;
      const platformFeeCents = Math.round(half * feePercent);
      const existingFee = await prisma.platformFee.findUnique({ where: { jobId: dispute.jobId } });
      if (!existingFee) {
        await prisma.platformFee.create({
          data: {
            jobId: dispute.jobId,
            amount: platformFeeCents,
            type: "PLATFORM_SERVICE",
            percent: feePercent,
            status: "RELEASED",
          },
        });
      }
    } else if (outcome === "DISMISSED") {
      await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "VOIDED" } });

      // Void any pending platform fee for this job
      await prisma.platformFee.updateMany({
        where: { jobId: dispute.jobId, status: "PENDING" },
        data: { status: "VOIDED" },
      });
    }
  }

  const [updated] = await prisma.$transaction([
    prisma.dispute.update({
      where: { id },
      data: { status: "RESOLVED", outcome, adminNote: adminNote || null },
    }),
    prisma.job.update({
      where: { id: dispute.jobId },
      data: { status: outcome === "DISMISSED" ? "CANCELLED" : "COMPLETED" },
    }),
  ]);

  // Notify both parties about dispute resolution
  const raiser = await prisma.user.findUnique({ where: { id: dispute.raisedById }, select: { name: true, email: true } });
  const poster = await prisma.user.findUnique({ where: { id: dispute.job.posterId }, select: { name: true, email: true } });
  const acceptedApp = await prisma.application.findFirst({
    where: { jobId: dispute.jobId, status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
    include: { worker: { select: { name: true, email: true } } },
  });

  const outcomeLabel = {
    WORKER_FAVOR: "Worker Favor (payment released to worker)",
    POSTER_FAVOR: "Poster Favor (payment released to poster)",
    SPLIT: "Split (payment shared)",
    DISMISSED: "Dismissed (payment voided)",
  }[outcome] ?? outcome;

  // Notify raiser
  if (raiser) {
    await sendEmail(emailDisputeResolved({
      raiserName: raiser.name ?? "a user",
      jobTitle: dispute.job.title,
      recipientName: raiser.name ?? "you",
      outcome: outcomeLabel,
    }));
  }

  // Notify the other party
  const otherParty = acceptedApp?.worker || poster;
  if (otherParty) {
    await sendEmail(emailDisputeResolved({
      raiserName: raiser?.name ?? "a user",
      jobTitle: dispute.job.title,
      recipientName: otherParty.name ?? "the other party",
      outcome: outcomeLabel,
    }));
  }

  return NextResponse.json(updated);
}
