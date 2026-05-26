import { prisma } from "@/app/lib/prisma";

export async function getPlatformFeePercent() {
  const config = await prisma.adminConfig.findUnique({ where: { key: "PLATFORM_FEE_PERCENT" } });
  if (!config) return 0.10;
  return parseFloat(config.value) || 0.10;
}

export async function recordReleasedPlatformFee(jobId: string, paymentAmountCents: number) {
  const feePercent = await getPlatformFeePercent();
  const platformFeeCents = Math.round(paymentAmountCents * feePercent);
  const existingPlatformFee = await prisma.platformFee.findUnique({ where: { jobId } });

  const platformFee = await prisma.platformFee.upsert({
    where: { jobId },
    update: {
      amount: platformFeeCents,
      type: "PLATFORM_SERVICE",
      percent: feePercent,
      status: "RELEASED",
    },
    create: {
      jobId,
      amount: platformFeeCents,
      type: "PLATFORM_SERVICE",
      percent: feePercent,
      status: "RELEASED",
    },
  });

  return { platformFee, amount: platformFeeCents, percent: feePercent, alreadyExists: !!existingPlatformFee };
}
