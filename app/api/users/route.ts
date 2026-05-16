import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

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

  return NextResponse.json(user, { status: 201 });
}
