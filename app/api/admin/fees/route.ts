import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const type = searchParams.get("type") ?? "all"; // "all", "platform", "background_check"

  const offset = (page - 1) * limit;

  let whereClause: any = {};
  if (type === "platform") whereClause = { type: "PLATFORM_SERVICE" };
  if (type === "background_check") whereClause = {}; // BG check fees use a separate model

  const [platformFees, bgCheckFees, platformTotal, bgCheckTotal] = await Promise.all([
    prisma.platformFee.findMany({
      where: whereClause,
      include: { job: { select: { id: true, title: true, payRate: true, status: true } } },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.backgroundCheckFee.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.platformFee.aggregate({
      where: { status: "RELEASED" },
      _sum: { amount: true },
    }),
    prisma.backgroundCheckFee.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  const [platformCount, bgCheckCount] = await Promise.all([
    prisma.platformFee.count({ where: whereClause }),
    prisma.backgroundCheckFee.count(),
  ]);

  return NextResponse.json({
    platformFees: platformFees.map(f => ({
      id: f.id,
      jobId: f.jobId,
      jobTitle: f.job.title,
      jobStatus: f.job.status,
      amount: f.amount,
      percent: f.percent,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
    })),
    backgroundCheckFees: bgCheckFees.map(f => ({
      id: f.id,
      workerId: f.workerId,
      amount: f.amount,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
    })),
    totals: {
      platformRevenueCents: platformTotal._sum.amount ?? 0,
      platformRevenueDollar: ((platformTotal._sum.amount ?? 0) / 100).toFixed(2),
      bgCheckRevenueCents: bgCheckTotal._sum.amount ?? 0,
      bgCheckRevenueDollar: ((bgCheckTotal._sum.amount ?? 0) / 100).toFixed(2),
      totalRevenueCents: ((platformTotal._sum.amount ?? 0) + (bgCheckTotal._sum.amount ?? 0)),
      totalRevenueDollar: (((platformTotal._sum.amount ?? 0) + (bgCheckTotal._sum.amount ?? 0)) / 100).toFixed(2),
    },
    pagination: {
      page,
      limit,
      platformTotalCount: platformCount,
      bgCheckTotalCount: bgCheckCount,
    },
  });
}
