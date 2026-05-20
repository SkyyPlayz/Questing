import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";
import { awardXP } from "@/app/lib/xp";
import { sendEmail } from "@/app/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { name, email, password, role } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const validRoles = ["WORKER", "POSTER"];
  const userRole = validRoles.includes(role) ? role : "WORKER";

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: userRole },
    select: { id: true, email: true, name: true, role: true },
  });

  // Award starter XP for new user
  await awardXP(user.id, "USER_CREATED");

  // Send email verification
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier: `verify:${email}`, token: email } },
    update: { token: verifyToken, expires },
    create: { identifier: `verify:${email}`, token: verifyToken, expires },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: { email: user.email, name: user.name ?? undefined },
    subject: "Job Quest — Verify your email address",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #1a1a2e; margin-bottom: 20px;">Verify your email</h2>
        <p>Hi ${user.name ?? "there"},</p>
        <p>Welcome to Job Quest! Please verify your email address by clicking the link below.</p>
        <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create a Job Quest account, you can ignore this email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">Job Quest — Find work. Earn XP. Level up.</p>
      </div>
    `,
  });

  return NextResponse.json(user, { status: 201 });
}
