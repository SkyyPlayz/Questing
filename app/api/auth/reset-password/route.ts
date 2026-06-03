import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { normalizeEmail } from "@/app/lib/email-normalization";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, token, password } = await req.json();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !token || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: `reset:${normalizedEmail}`, token } },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: `reset:${normalizedEmail}`, token } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
