import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { sendEmail, emailPaymentReleased, emailPaymentRefunded, BASE } from "@/app/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Params = { params: Promise<{ id: string }> };

async function getPlatformFeePercent() {
  const config = await prisma.adminConfig.findUnique({ where: { key: "PLATFORM_FEE_PERCENT" } });
  if (!config) return 0.10; // default 10%
  return parseFloat(config.value) || 0.10;
}

async function getBackgroundCheckFeeCents() {
  const config = await prisma.adminConfig.findUnique({ where: { key: "BACKGROUND_CHECK_FEE_CENTS" } });
  if (!config) return 2500; // default $25.00
  return parseInt(config.value, 10) || 2500;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { job: true },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.status !== "HELD") {
    return NextResponse.json({ error: "Payment is not in HELD state" }, { status: 400 });
  }
  if (!payment.stripePaymentIntentId) {
    return NextResponse.json({ error: "No payment intent on record" }, { status: 400 });
  }

  const { action, amount } = await req.json();

  if (action === "capture") {
    // Calculate and record platform fee
    const feePercent = await getPlatformFeePercent();
    const platformFeeCents = Math.round(payment.amount * feePercent);

    await stripe.paymentIntents.capture(payment.stripePaymentIntentId);

    // Create platform fee record (only if one doesn't already exist — job completion auto-capture may have already created it)
    const existingFee = await prisma.platformFee.findUnique({ where: { jobId: payment.jobId } });
    if (!existingFee) {
      await prisma.platformFee.create({
        data: {
          jobId: payment.jobId,
          amount: platformFeeCents,
          type: "PLATFORM_SERVICE",
          percent: feePercent,
          status: "RELEASED",
        },
      });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: { status: "RELEASED" },
    });

    // Notify worker and poster about payment release
    const acceptedApp = await prisma.application.findFirst({
      where: { jobId: payment.jobId, status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
      include: { worker: { select: { id: true, name: true, email: true } } },
    });
    const poster = await prisma.user.findUnique({
      where: { id: payment.job.posterId },
      select: { name: true, email: true },
    });
    if (acceptedApp?.worker) {
      await sendEmail({
        to: { email: acceptedApp.worker.email, name: acceptedApp.worker.name ?? undefined },
        ...emailPaymentReleased({
          workerName: acceptedApp.worker.name ?? "Worker",
          jobTitle: payment.job.title,
          amount: payment.amount,
        }),
      });
    }
    if (poster?.email) {
      await sendEmail({
        to: { email: poster.email, name: poster.name ?? undefined },
        subject: `Payment released for "${payment.job.title}"`,
        html: BASE.replace("{title}", "Payment Released").replace("{body}",
          `Hi ${poster.name ?? "there"},\n\nPayment for "${payment.job.title}" has been released.\n\nAmount: $${(payment.amount / 100).toFixed(2)}\n\nThe quest is now fully settled.`
        ),
      });
    }

    return NextResponse.json({
      payment: updated,
      platformFee: { amount: platformFeeCents, percent: feePercent, alreadyExists: !!existingFee },
    });
  }

  if (action === "refund") {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: payment.stripePaymentIntentId,
    };
    if (amount) refundParams.amount = Math.round(amount);
    await stripe.refunds.create(refundParams);
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: "REFUNDED" },
    });

    // Notify worker and poster about refund
    const acceptedApp = await prisma.application.findFirst({
      where: { jobId: payment.jobId, status: { in: ["ACCEPTED", "FCFS_ACCEPTED"] } },
      include: { worker: { select: { id: true, name: true, email: true } } },
    });
    const poster = await prisma.user.findUnique({
      where: { id: payment.job.posterId },
      select: { name: true, email: true },
    });
    if (acceptedApp?.worker) {
      await sendEmail({
        to: { email: acceptedApp.worker.email, name: acceptedApp.worker.name ?? undefined },
        ...emailPaymentRefunded({
          workerName: acceptedApp.worker.name ?? "Worker",
          jobTitle: payment.job.title,
          amount: payment.amount,
        }),
      });
    }
    if (poster?.email) {
      await sendEmail({
        to: { email: poster.email, name: poster.name ?? undefined },
        subject: `Payment refunded for "${payment.job.title}"`,
        html: BASE.replace("{title}", "Payment Refunded").replace("{body}",
          `Hi ${poster.name ?? "there"},\n\nPayment for "${payment.job.title}" has been refunded.\n\nAmount: $${(payment.amount / 100).toFixed(2)}\n\nThe quest is now fully settled.`
        ),
      });
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "action must be capture or refund" }, { status: 400 });
}
