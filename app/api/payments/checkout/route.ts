import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { parseJsonBody } from "@/app/lib/api-json";
import { createDurableCheckoutSession, CheckoutFlowError } from "@/app/lib/paymentCheckout";
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

  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody.response;
  const { jobId } = parsedBody.data;
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
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const checkout = await createDurableCheckoutSession(job, baseUrl, {
      createPendingPayment: (data) =>
        prisma.payment.create({
          data: {
            jobId: data.jobId,
            amount: data.amount,
            status: "PENDING",
          },
        }),
      createStripeCheckoutSession: ({ amountCents, jobId, paymentId, title }) =>
        stripe.checkout.sessions.create({
          mode: "payment",
          payment_intent_data: {
            capture_method: "manual",
            metadata: { jobId, paymentId },
          },
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: amountCents,
                product_data: { name: title },
              },
              quantity: 1,
            },
          ],
          success_url: `${baseUrl}/jobs/${jobId}?payment=success`,
          cancel_url: `${baseUrl}/jobs/${jobId}?payment=cancelled`,
          metadata: { jobId, paymentId },
        }),
      expireStripeCheckoutSession: (sessionId) => stripe.checkout.sessions.expire(sessionId).then(() => undefined),
      markPaymentVoided: (paymentId) =>
        prisma.payment.update({ where: { id: paymentId }, data: { status: "VOIDED" } }).then(() => undefined),
      resetPaymentForRetry: (paymentId, data) =>
        prisma.payment.update({
          where: { id: paymentId },
          data: {
            amount: data.amount,
            status: "PENDING",
            stripeCheckoutSessionId: null,
            stripePaymentIntentId: null,
          },
        }),
      updatePaymentCheckoutSession: (paymentId, sessionId) =>
        prisma.payment
          .update({
            where: { id: paymentId },
            data: { stripeCheckoutSessionId: sessionId },
          })
          .then(() => undefined),
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    if (error instanceof CheckoutFlowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Checkout could not be initialized" }, { status: 500 });
  }
}
