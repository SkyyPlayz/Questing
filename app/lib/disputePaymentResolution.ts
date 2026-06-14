type DisputeOutcome = "WORKER_FAVOR" | "POSTER_FAVOR" | "SPLIT" | "DISMISSED";

export type DisputePaymentResolution =
  | { action: "capture"; paymentStatus: "RELEASED"; amountToCapture?: number }
  | { action: "cancel"; paymentStatus: "VOIDED" };

export function resolveHeldDisputePayment(
  outcome: DisputeOutcome,
  paymentAmount: number,
): DisputePaymentResolution {
  switch (outcome) {
    case "WORKER_FAVOR":
      return { action: "capture", paymentStatus: "RELEASED" };
    case "SPLIT":
      return {
        action: "capture",
        paymentStatus: "RELEASED",
        amountToCapture: Math.floor(paymentAmount / 2),
      };
    case "POSTER_FAVOR":
    case "DISMISSED":
      return { action: "cancel", paymentStatus: "VOIDED" };
  }
}
