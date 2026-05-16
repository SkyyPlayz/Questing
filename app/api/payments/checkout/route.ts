import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (user.role !== "POSTER") {
    return NextResponse.json({ error: "Only posters can initiate payment" }, { status: 403 });
  }

  const { jobId } = await req.json();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { payment: true },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.posterId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (job.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Job must be IN_PROGRESS to initiate payment" }, { status: 400 });
  }
  if (job.payment) {
    return NextResponse.json({ error: "Payment already initiated for this job" }, { status: 409 });
  }

  const amountCents = Math.round(job.payRate * 100);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_intent_data: {
      capture_method: "manual",
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: job.title },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/jobs/${jobId}?payment=success`,
    cancel_url: `${baseUrl}/jobs/${jobId}?payment=cancelled`,
    metadata: { jobId },
  });

  await prisma.payment.create({
    data: {
      jobId,
      stripeCheckoutSessionId: checkoutSession.id,
      amount: amountCents,
      status: "PENDING",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
