import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getStripeClient, isStripeConfigurationError } from "@/app/lib/stripe";
import { JobStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      poster: { select: { id: true, name: true, email: true } },
      applications: {
        include: { worker: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const user = session.user as { id: string; role: string };

  const job = await prisma.job.findUnique({ where: { id }, include: { payment: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.posterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { status, title, description, category, location, payRate, payUnit, startDate, endDate } = body;

  // Validate status transitions
  const validTransitions: Record<JobStatus, JobStatus[]> = {
    DRAFT: ["OPEN", "CANCELLED"],
    OPEN: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED", "DISPUTED"],
    COMPLETED: [],
    CANCELLED: [],
    DISPUTED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  };

  if (status && status !== job.status) {
    if (!validTransitions[job.status].includes(status as JobStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${job.status} to ${status}` },
        { status: 400 }
      );
    }
  }

  let stripeForPaymentAction: ReturnType<typeof getStripeClient> | null = null;
  const paymentIntentId = job.payment?.stripePaymentIntentId;
  const needsStripePaymentAction =
    paymentIntentId &&
    job.payment?.status === "HELD" &&
    (status === "COMPLETED" || status === "CANCELLED");

  if (needsStripePaymentAction) {
    try {
      stripeForPaymentAction = getStripeClient();
    } catch (error) {
      if (isStripeConfigurationError(error)) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      throw error;
    }
  }

  const updated = await prisma.job.update({
    where: { id },
    include: { payment: true },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(category && { category }),
      ...(location && { location }),
      ...(payRate !== undefined && { payRate: parseFloat(payRate) }),
      ...(payUnit && { payUnit }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(status && { status: status as JobStatus }),
    },
  });

  if (stripeForPaymentAction && paymentIntentId && updated.payment) {
    if (status === "COMPLETED") {
      await stripeForPaymentAction.paymentIntents.capture(paymentIntentId);
      await prisma.payment.update({ where: { id: updated.payment.id }, data: { status: "RELEASED" } });
    } else if (status === "CANCELLED") {
      await stripeForPaymentAction.paymentIntents.cancel(paymentIntentId);
      await prisma.payment.update({ where: { id: updated.payment.id }, data: { status: "VOIDED" } });
    }
  }

  return NextResponse.json(updated);
}
