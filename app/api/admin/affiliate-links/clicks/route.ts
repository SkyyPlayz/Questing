import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

// GET /api/admin/affiliate-links/clicks
// Admin endpoint — returns click analytics with optional filters
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const affiliateLinkId = searchParams.get("affiliateLinkId");
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    // Summary stats
    const summary = await prisma.affiliateLinkClick.aggregate({
      _count: { id: true },
    });

    // Per-link breakdown
    const perLink = await prisma.affiliateLink.findMany({
      select: {
        id: true,
        toolName: true,
        jobCategory: true,
        clickCount: true,
        clicks: {
          take: limit,
          skip: offset,
          orderBy: { clickedAt: "desc" },
          ...(affiliateLinkId ? { where: { affiliateLinkId } } : {}),
          ...(userId ? { where: { userId } } : {}),
          include: {
            affiliateLink: { select: { toolName: true, jobCategory: true } },
          },
        },
      },
    });

    // If filtering by specific link, get detailed clicks
    let detailedClicks: Awaited<ReturnType<typeof prisma.affiliateLinkClick.findMany>> = [];
    if (affiliateLinkId) {
      detailedClicks = await prisma.affiliateLinkClick.findMany({
        where: { affiliateLinkId },
        orderBy: { clickedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          affiliateLink: { select: { toolName: true, jobCategory: true, retailer: true } },
        },
      });
    }

    return NextResponse.json({
      totalClicks: summary._count.id,
      perLink,
      detailedClicks,
    });
  } catch (err) {
    console.error("admin affiliate clicks GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
