import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/app/lib/api-json";
import { prisma } from "@/app/lib/prisma";
import { escapeHtml, sendEmail, validateEmailUrl } from "@/app/lib/email";
import { replaceVerificationToken } from "@/app/lib/auth-tokens";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody.response;
  const { email } = parsedBody.data;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return 200 to avoid user enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await replaceVerificationToken(`reset:${email}`, token, expires);

  const resetUrl = validateEmailUrl(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`);

  await sendEmail({
    to: { email: user.email, name: user.name ?? undefined },
    subject: "Job Quest — Reset your password",
    html: `
      <p>Hi ${escapeHtml(user.name ?? "there")},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
