type JobStatus = "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
type PaymentStatus = "PENDING" | "HELD" | "RELEASED" | "VOIDED" | "REFUNDED";

export type JobStatusHeldPaymentAction =
  | { action: "none" }
  | { action: "cancel"; paymentStatus: "VOIDED" };

export type AdminHeldPaymentReleaseAction =
  | { action: "capture"; paymentStatus: "RELEASED" }
  | { action: "refund"; paymentStatus: "REFUNDED" };

type HeldPaymentInput = {
  paymentStatus?: PaymentStatus | null;
  paymentIntentId?: string | null;
};

export function resolveJobStatusHeldPaymentAction({
  requestedStatus,
  paymentStatus,
  paymentIntentId,
}: HeldPaymentInput & { requestedStatus?: JobStatus | null }): JobStatusHeldPaymentAction {
  if (paymentStatus !== "HELD" || !paymentIntentId) {
    return { action: "none" };
  }

  if (requestedStatus === "CANCELLED") {
    return { action: "cancel", paymentStatus: "VOIDED" };
  }

  return { action: "none" };
}

export function resolveAdminHeldPaymentReleaseAction(
  action: unknown,
): AdminHeldPaymentReleaseAction | null {
  if (action === "capture") {
    return { action, paymentStatus: "RELEASED" };
  }

  if (action === "refund") {
    return { action, paymentStatus: "REFUNDED" };
  }

  return null;
}
