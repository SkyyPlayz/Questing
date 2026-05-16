import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { DisputeOutcome } from "@prisma/client";

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
    } else if (outcome === "SPLIT") {
      const half = Math.floor(payment.amount / 2);
      await stripe.paymentIntents.capture(payment.stripePaymentIntentId, { amount_to_capture: half });
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "RELEASED" } });
    } else if (outcome === "DISMISSED") {
      await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "VOIDED" } });
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

  return NextResponse.json(updated);
}
