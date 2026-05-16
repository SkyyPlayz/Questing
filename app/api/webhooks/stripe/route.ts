import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/app/lib/prisma";

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
      if (session.payment_intent && session.metadata?.jobId) {
        await prisma.payment.updateMany({
          where: { stripeCheckoutSessionId: session.id },
          data: {
            stripePaymentIntentId: session.payment_intent as string,
            status: "HELD",
          },
        });
      }
      break;
    }

    case "payment_intent.amount_capturable_updated": {
      // fired after manual capture; we rely on the explicit capture call updating DB directly
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent as string },
          data: { status: "REFUNDED" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
