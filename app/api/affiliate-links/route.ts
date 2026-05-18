import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET /api/affiliate-links?category={jobCategory}
// Public endpoint — returns active recommendations for a job category
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  if (!category) {
    return NextResponse.json({ error: "category parameter required" }, { status: 400 });
  }

  try {
    const links = await prisma.affiliateLink.findMany({
      where: {
        jobCategory: category,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(links);
  } catch (err) {
    console.error("affiliate-links GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
