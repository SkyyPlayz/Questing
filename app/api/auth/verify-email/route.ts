import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { escapeHtml, sendEmail, validateEmailUrl } from "@/app/lib/email";
import { replaceVerificationToken } from "@/app/lib/auth-tokens";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return 200 to avoid user enumeration
  if (!user) return NextResponse.json({ ok: true });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

  await replaceVerificationToken(`verify:${email}`, token, expires);

  const verifyUrl = validateEmailUrl(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify-email?token=${token}&email=${encodeURIComponent(email)}`);

  await sendEmail({
    to: { email: user.email, name: user.name ?? undefined },
    subject: "Job Quest — Verify your email address",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #1a1a2e; margin-bottom: 20px;">Verify your email</h2>
        <p>Hi ${escapeHtml(user.name ?? "there")},</p>
        <p>Welcome to Job Quest! Please verify your email address by clicking the link below.</p>
        <p><a href="${escapeHtml(verifyUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create a Job Quest account, you can ignore this email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">Job Quest — Find work. Earn XP. Level up.</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.json({ error: "Missing token or email" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: `verify:${email}`, token } },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { emailVerified: new Date(), status: "ACTIVE" },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: `verify:${email}`, token } },
    }),
  ]);

  return NextResponse.json({ ok: true, verified: true });
}
