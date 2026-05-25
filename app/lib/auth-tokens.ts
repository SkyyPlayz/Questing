import { prisma } from "@/app/lib/prisma";

export async function replaceVerificationToken(identifier: string, token: string, expires: Date) {
  await prisma.$transaction([
    prisma.verificationToken.create({ data: { identifier, token, expires } }),
    prisma.verificationToken.deleteMany({ where: { identifier, NOT: { token } } }),
  ]);
}
