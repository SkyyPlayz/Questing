import { calculateCheckoutAmountCents } from "./paymentAmount";

export type CheckoutPaymentRecord = {
  id: string;
  jobId: string;
  amount: number;
  status: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
};

export type CheckoutJob = {
  id: string;
  title: string;
  payRate: number;
  payUnit: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  payment: CheckoutPaymentRecord | null;
};

type CheckoutSession = {
  id: string;
  url: string | null;
};

type CheckoutSessionRequest = {
  amountCents: number;
  baseUrl: string;
  jobId: string;
  paymentId: string;
  title: string;
};

export type CheckoutDependencies = {
  createPendingPayment(data: { jobId: string; amount: number }): Promise<CheckoutPaymentRecord>;
  createStripeCheckoutSession(data: CheckoutSessionRequest): Promise<CheckoutSession>;
  expireStripeCheckoutSession(sessionId: string): Promise<void>;
  markPaymentVoided(paymentId: string): Promise<void>;
  resetPaymentForRetry(paymentId: string, data: { amount: number }): Promise<CheckoutPaymentRecord>;
  updatePaymentCheckoutSession(paymentId: string, sessionId: string): Promise<void>;
};

export class CheckoutFlowError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CheckoutFlowError";
  }
}

function canReusePayment(payment: CheckoutPaymentRecord, amountCents: number): boolean {
  return (
    payment.amount === amountCents &&
    payment.status === "PENDING" &&
    !payment.stripeCheckoutSessionId &&
    !payment.stripePaymentIntentId
  );
}

function canResetPayment(payment: CheckoutPaymentRecord): boolean {
  return payment.status === "VOIDED" && !payment.stripeCheckoutSessionId && !payment.stripePaymentIntentId;
}

export async function createDurableCheckoutSession(
  job: CheckoutJob,
  baseUrl: string,
  deps: CheckoutDependencies,
): Promise<{ url: string }> {
  let amountCents: number;
  try {
    amountCents = calculateCheckoutAmountCents(job);
  } catch (error) {
    throw new CheckoutFlowError(error instanceof Error ? error.message : "Invalid job payment amount", 400);
  }

  let payment = job.payment;
  if (payment) {
    if (canReusePayment(payment, amountCents)) {
      // Continue below with the existing local anchor left by an interrupted prior attempt.
    } else if (canResetPayment(payment)) {
      try {
        payment = await deps.resetPaymentForRetry(payment.id, { amount: amountCents });
      } catch (error) {
        throw new CheckoutFlowError(
          error instanceof Error ? `Payment could not be reset for retry: ${error.message}` : "Payment could not be reset for retry",
          500,
        );
      }
    } else {
      throw new CheckoutFlowError("Payment already initiated for this job", 409);
    }
  } else {
    try {
      payment = await deps.createPendingPayment({ jobId: job.id, amount: amountCents });
    } catch (error) {
      throw new CheckoutFlowError(
        error instanceof Error
          ? `Payment could not be initialized locally: ${error.message}`
          : "Payment could not be initialized locally",
        500,
      );
    }
  }

  let checkoutSession: CheckoutSession;
  try {
    checkoutSession = await deps.createStripeCheckoutSession({
      amountCents,
      baseUrl,
      jobId: job.id,
      paymentId: payment.id,
      title: job.title,
    });
  } catch (error) {
    await deps.markPaymentVoided(payment.id).catch(() => undefined);
    throw new CheckoutFlowError(
      error instanceof Error ? `Stripe checkout creation failed: ${error.message}` : "Stripe checkout creation failed",
      502,
    );
  }

  try {
    await deps.updatePaymentCheckoutSession(payment.id, checkoutSession.id);
  } catch (error) {
    await deps.expireStripeCheckoutSession(checkoutSession.id).catch(() => undefined);
    throw new CheckoutFlowError(
      error instanceof Error
        ? `Checkout session could not be recorded locally: ${error.message}`
        : "Checkout session could not be recorded locally",
      500,
    );
  }

  if (!checkoutSession.url) {
    await deps.expireStripeCheckoutSession(checkoutSession.id).catch(() => undefined);
    throw new CheckoutFlowError("Stripe checkout session did not include a redirect URL", 502);
  }

  return { url: checkoutSession.url };
}
