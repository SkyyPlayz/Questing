type BackgroundCheckCheckoutSession = {
  payment_intent: string | null;
  metadata?: {
    workerId?: string;
  } | null;
};

type BackgroundCheckFeeDelegate = {
  updateMany: (args: {
    where: { workerId: string; status: "PENDING" };
    data: { stripePaymentIntentId: string; status: "PAID" };
  }) => Promise<unknown>;
};

export async function applyBackgroundCheckPaymentCompletion({
  session,
  prisma,
}: {
  session: BackgroundCheckCheckoutSession;
  prisma: { backgroundCheckFee: BackgroundCheckFeeDelegate };
}) {
  if (!session.payment_intent || !session.metadata?.workerId) {
    return;
  }

  await prisma.backgroundCheckFee.updateMany({
    where: { workerId: session.metadata.workerId, status: "PENDING" },
    data: {
      stripePaymentIntentId: session.payment_intent,
      status: "PAID",
    },
  });
}
