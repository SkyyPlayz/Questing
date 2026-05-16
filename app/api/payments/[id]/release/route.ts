import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  if (action === "capture") {
    await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: "RELEASED" },
    });
    return NextResponse.json(updated);
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
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "action must be capture or refund" }, { status: 400 });
}
