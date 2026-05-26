import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { validateJobUpdateInput } from "@/app/lib/jobInputValidation";
import { prisma } from "@/app/lib/prisma";
import { JobStatus } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.posterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { status } = body;

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

  const validation = validateJobUpdateInput(body, {
    startDate: job.startDate,
    endDate: job.endDate,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const updated = await prisma.job.update({
    where: { id },
    include: { payment: true },
    data: {
      ...validation.data,
      ...(status && { status: status as JobStatus }),
    },
  });

  if (status && status !== job.status && updated.payment?.stripePaymentIntentId) {
    const pi = updated.payment.stripePaymentIntentId;
    if (status === "COMPLETED" && updated.payment.status === "HELD") {
      await stripe.paymentIntents.capture(pi);
      await prisma.payment.update({ where: { id: updated.payment.id }, data: { status: "RELEASED" } });
    } else if (status === "CANCELLED" && updated.payment.status === "HELD") {
      await stripe.paymentIntents.cancel(pi);
      await prisma.payment.update({ where: { id: updated.payment.id }, data: { status: "VOIDED" } });
    }
  }

  return NextResponse.json(updated);
}
