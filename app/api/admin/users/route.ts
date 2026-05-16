import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const role = searchParams.get("role") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(role && { role: role as never }),
      ...(status && { status: status as never }),
    },
    include: { workerProfile: true, posterProfile: true, competencyScore: true, riskScore: true },
    omit: { passwordHash: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
