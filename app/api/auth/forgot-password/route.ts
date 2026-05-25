import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendEmail } from "@/app/lib/email";
import { isTokenValid } from "@/app/lib/authTokens";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return 200 to avoid user enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Find any existing reset token by identifier only, then update or create.
  // Using findFirst + update/create avoids the broken upsert pattern where
  // the compound-key lookup used `token: email` (the email address) rather
  // than the previously stored hex token value.
  const existingReset = await prisma.verificationToken.findFirst({
    where: { identifier: `reset:${email}` },
  });

  if (existingReset) {
    await prisma.verificationToken.update({
      where: { identifier_token: { identifier: `reset:${email}`, token: existingReset.token } },
      data: { token, expires },
    });
  } else {
    await prisma.verificationToken.create({
      data: { identifier: `reset:${email}`, token, expires },
    });
  }

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: { email: user.email, name: user.name ?? undefined },
    subject: "Job Quest — Reset your password",
    html: `
      <p>Hi ${user.name ?? "there"},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
