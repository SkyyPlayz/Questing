import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/app/lib/prisma";
import { recordReleasedPlatformFee } from "@/app/lib/platform-fees";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Handle job payment checkout
      if (session.payment_intent && session.metadata?.jobId) {
        await prisma.payment.updateMany({
          where: { stripeCheckoutSessionId: session.id },
          data: {
            stripePaymentIntentId: session.payment_intent as string,
            status: "HELD",
          },
        });
      }
      // Handle background check fee checkout
      if (session.payment_intent && session.metadata?.workerId) {
        await prisma.backgroundCheckFee.updateMany({
          where: { stripeCheckoutSessionId: session.id, status: "PENDING" },
          data: {
            stripePaymentIntentId: session.payment_intent as string,
            status: "PAID",
          },
        });
        // Also update worker's background check status
        await prisma.workerProfile.updateMany({
          where: { userId: session.metadata.workerId },
          data: { backgroundCheckStatus: "PASSED" },
        });
      }
      break;
    }

    case "payment_intent.amount_capturable_updated": {
      // fired after manual capture; we rely on the explicit capture call updating DB directly
      break;
    }

    case "payment_intent.succeeded": {
      // Safety net: tolerate webhook/API ordering and converge on one fee row per job.
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.jobId) {
        await recordReleasedPlatformFee(pi.metadata.jobId, pi.amount);
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent as string },
          data: { status: charge.refunded ? "REFUNDED" : "RELEASED" },
        });
        await prisma.backgroundCheckFee.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent as string },
          data: { status: charge.refunded ? "REFUNDED" : "PAID" },
        });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.workerId) {
        // Worker's background check payment failed — void the fee record
        await prisma.backgroundCheckFee.updateMany({
          where: { stripePaymentIntentId: pi.id, status: "PENDING" },
          data: { status: "VOIDED" },
        });
      }
      if (pi.metadata?.jobId) {
        // Job payment failed — void payment and any pending platform fee
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: pi.id, status: "PENDING" },
          data: { status: "VOIDED" },
        });
        await prisma.platformFee.updateMany({
          where: { jobId: pi.metadata.jobId, status: "PENDING" },
          data: { status: "VOIDED" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
