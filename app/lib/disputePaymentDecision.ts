export type DisputeResolutionOutcome = "WORKER_FAVOR" | "POSTER_FAVOR" | "SPLIT" | "DISMISSED";

type HeldDisputePaymentDecision = {
  stripeAction: "capture" | "cancel";
  paymentStatus: "RELEASED" | "VOIDED";
  amountToCapture?: number;
  platformFeeBaseAmountCents: number;
  voidPendingPlatformFees: boolean;
};

export function getHeldDisputePaymentDecision(outcome: DisputeResolutionOutcome, paymentAmountCents: number): HeldDisputePaymentDecision {
  if (outcome === "WORKER_FAVOR") {
    return {
      stripeAction: "capture",
      paymentStatus: "RELEASED",
      platformFeeBaseAmountCents: paymentAmountCents,
      voidPendingPlatformFees: false,
    };
  }

  if (outcome === "SPLIT") {
    const half = Math.floor(paymentAmountCents / 2);
    return {
      stripeAction: "capture",
      paymentStatus: "RELEASED",
      amountToCapture: half,
      platformFeeBaseAmountCents: half,
      voidPendingPlatformFees: false,
    };
  }

  return {
    stripeAction: "cancel",
    paymentStatus: "VOIDED",
    platformFeeBaseAmountCents: 0,
    voidPendingPlatformFees: true,
  };
}
