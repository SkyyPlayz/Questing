import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { sendEmail, emailPaymentReleased, emailPaymentRefunded, BASE } from "@/app/lib/email";
import { recordReleasedPlatformFee } from "@/app/lib/platform-fees";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Params = { params: Promise<{ id: string }> };
type PaymentAction = "capture" | "refund";

function isPaymentAction(action: unknown): action is PaymentAction {
  return action === "capture" || action === "refund";
}

function isExpandedCharge(charge: Stripe.Refund["charge"]): charge is Stripe.Charge {
  return typeof charge === "object" && charge !== null && charge.object === "charge";
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
  if (!payment.stripePaymentIntentId) {
    return NextResponse.json({ error: "No payment intent on record" }, { status: 400 });
  }

  const { action, amount } = await req.json();
  if (!isPaymentAction(action)) {
    return NextResponse.json({ error: "action must be capture or refund" }, { status: 400 });
  }

  if (action === "capture") {
    if (payment.status !== "HELD") {
      return NextResponse.json({ error: "Payment is not in HELD state" }, { status: 400 });
    }

    await stripe.paymentIntents.capture(payment.stripePaymentIntentId);

    const platformFeeResult = await recordReleasedPlatformFee(payment.jobId, payment.amount);

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
      platformFee: {
        amount: platformFeeResult.amount,
        percent: platformFeeResult.percent,
        alreadyExists: platformFeeResult.alreadyExists,
      },
    });
  }

  if (action === "refund") {
    if (!["HELD", "RELEASED"].includes(payment.status)) {
      return NextResponse.json({ error: "Payment is not refundable" }, { status: 400 });
    }

    const refundAmount = amount === undefined ? undefined : Math.round(Number(amount));
    if (refundAmount !== undefined && (!Number.isFinite(refundAmount) || refundAmount <= 0)) {
      return NextResponse.json({ error: "amount must be a positive number of cents" }, { status: 400 });
    }
    if (refundAmount !== undefined && refundAmount > payment.amount) {
      return NextResponse.json({ error: "amount cannot exceed payment amount" }, { status: 400 });
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: payment.stripePaymentIntentId,
      expand: ["charge"],
    };
    if (refundAmount !== undefined) refundParams.amount = refundAmount;
    const refund = await stripe.refunds.create(refundParams);
    const isFullyRefunded = isExpandedCharge(refund.charge)
      ? refund.charge.refunded
      : refundAmount === undefined || refundAmount >= payment.amount;
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: isFullyRefunded ? "REFUNDED" : payment.status },
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
          amount: refund.amount,
        }),
      });
    }
    if (poster?.email) {
      await sendEmail({
        to: { email: poster.email, name: poster.name ?? undefined },
        subject: `Payment refunded for "${payment.job.title}"`,
        html: BASE.replace("{title}", "Payment Refunded").replace("{body}",
          `Hi ${poster.name ?? "there"},\n\nPayment for "${payment.job.title}" has been refunded.\n\nAmount: $${(refund.amount / 100).toFixed(2)}\n\nThe quest is now fully settled.`
        ),
      });
    }

    return NextResponse.json({ payment: updated, refund: { id: refund.id, amount: refund.amount, status: refund.status, fullyRefunded: isFullyRefunded } });
  }
}
