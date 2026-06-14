import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { resolveAdminHeldPaymentReleaseAction } from "@/app/lib/paymentReleasePolicy";
import { getStripeClient, isStripeConfigurationError } from "@/app/lib/stripe";

type Params = { params: Promise<{ id: string }> };

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
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.status !== "HELD") {
    return NextResponse.json({ error: "Payment is not in HELD state" }, { status: 400 });
  }
  if (!payment.stripePaymentIntentId) {
    return NextResponse.json({ error: "No payment intent on record" }, { status: 400 });
  }

  const { action, amount } = await req.json();

  try {
    const stripe = getStripeClient();
    const releaseAction = resolveAdminHeldPaymentReleaseAction(action);

    if (releaseAction?.action === "capture") {
      await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
      const updated = await prisma.payment.update({
        where: { id },
        data: { status: releaseAction.paymentStatus },
      });
      return NextResponse.json(updated);
    }

    if (releaseAction?.action === "refund") {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: payment.stripePaymentIntentId,
      };
      if (amount) refundParams.amount = Math.round(amount);
      await stripe.refunds.create(refundParams);
      const updated = await prisma.payment.update({
        where: { id },
        data: { status: releaseAction.paymentStatus },
      });
      return NextResponse.json(updated);
    }
  } catch (error) {
    if (isStripeConfigurationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    throw error;
  }

  return NextResponse.json({ error: "action must be capture or refund" }, { status: 400 });
}
