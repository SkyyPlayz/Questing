import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

// POST /api/affiliate-links/{id}/click
// Tracks a click and redirects to affiliate URL
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  try {
    const link = await prisma.affiliateLink.findUnique({ where: { id } });
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    if (!link.isActive) return NextResponse.json({ error: "Link is inactive" }, { status: 400 });

    await prisma.affiliateLinkClick.create({
      data: {
        affiliateLinkId: id,
        userId: session?.user?.id || null,
        ipAddress,
      },
    });

    await prisma.affiliateLink.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
    });

    return NextResponse.json({ redirectUrl: link.affiliateUrl });
  } catch (err) {
    console.error("affiliate-click POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
