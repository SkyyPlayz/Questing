import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  buildJobDetailJobQuery,
  buildJobDetailApplicationsQuery,
  canViewJobApplications,
} from "@/app/lib/jobDetailVisibility";
import { validateJobUpdateInput } from "@/app/lib/jobInputValidation";
import { prisma } from "@/app/lib/prisma";
import { getStripeClient, isStripeConfigurationError } from "@/app/lib/stripe";
import { resolveJobStatusHeldPaymentAction } from "@/app/lib/paymentReleasePolicy";
import { JobStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  const job = await prisma.job.findUnique(buildJobDetailJobQuery(id));
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const applicationsQuery = buildJobDetailApplicationsQuery(
    id,
    user,
    canViewJobApplications(job, user),
  );
  const applications = applicationsQuery
    ? await prisma.application.findMany(applicationsQuery)
    : [];

  return NextResponse.json({ ...job, applications });
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

  let stripeForPaymentAction: ReturnType<typeof getStripeClient> | null = null;
  const paymentIntentId = job.payment?.stripePaymentIntentId;
  const heldPaymentAction = resolveJobStatusHeldPaymentAction({
    requestedStatus: status as JobStatus | undefined,
    paymentStatus: job.payment?.status,
    paymentIntentId,
  });

  if (heldPaymentAction.action !== "none") {
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
      ...validation.data,
      ...(status && { status: status as JobStatus }),
    },
  });

  if (stripeForPaymentAction && paymentIntentId && updated.payment) {
    if (heldPaymentAction.action === "cancel") {
      await stripeForPaymentAction.paymentIntents.cancel(paymentIntentId);
      await prisma.payment.update({
        where: { id: updated.payment.id },
        data: { status: heldPaymentAction.paymentStatus },
      });
    }
  }

  return NextResponse.json(updated);
}
