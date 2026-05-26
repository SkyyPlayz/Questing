import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function getBackgroundCheckFeeCents() {
  const config = await prisma.adminConfig.findUnique({ where: { key: "BACKGROUND_CHECK_FEE_CENTS" } });
  if (!config) return 2500; // default $25.00
  return parseInt(config.value, 10) || 2500;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (user.role !== "WORKER") {
    return NextResponse.json({ error: "Only workers can initiate background check payment" }, { status: 403 });
  }

  // Check if worker already has an active or completed background check fee.
  const existingFee = await prisma.backgroundCheckFee.findFirst({
    where: { workerId: user.id, status: { notIn: ["VOIDED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existingFee) {
    const isPending = existingFee.status === "PENDING";
    return NextResponse.json({
      error: isPending ? "Background check payment already pending" : "Background check fee already paid",
      existingFee: { status: existingFee.status, amount: existingFee.amount },
    }, { status: 409 });
  }

  const feeCents = await getBackgroundCheckFeeCents();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_intent_data: {
      metadata: { workerId: user.id, backgroundCheckFee: "true" },
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: feeCents,
          product_data: {
            name: "Job Quest Background Check",
            description: `One-time background check fee — $${(feeCents / 100).toFixed(2)}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/profile?bgcheck=success`,
    cancel_url: `${baseUrl}/profile?bgcheck=cancelled`,
    metadata: { workerId: user.id },
  });

  await prisma.backgroundCheckFee.create({
    data: {
      workerId: user.id,
      amount: feeCents,
      status: "PENDING",
      stripeCheckoutSessionId: checkoutSession.id,
      stripePaymentIntentId: checkoutSession.payment_intent as string || null,
    },
  });

  return NextResponse.json({ url: checkoutSession.url, amount: feeCents });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };

  const fee = await prisma.backgroundCheckFee.findFirst({
    where: { workerId: user.id },
  });

  const config = await prisma.adminConfig.findUnique({ where: { key: "BACKGROUND_CHECK_FEE_CENTS" } });
  const feeCents = config ? parseInt(config.value, 10) : 2500;

  return NextResponse.json({
    fee: fee ? { status: fee.status, amount: fee.amount } : null,
    currentFeeCents: feeCents,
  });
}
