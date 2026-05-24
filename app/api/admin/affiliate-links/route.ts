import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

// GET /api/admin/affiliate-links
// Admin list all affiliate links
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const links = await prisma.affiliateLink.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(links);
  } catch (err) {
    console.error("admin affiliate-links GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/admin/affiliate-links
// Admin create a new affiliate link
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const body = await request.json();
    const { jobCategory, toolName, description, affiliateUrl, retailer, imageUrl } = body;

    if (!jobCategory || !toolName || !description || !affiliateUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const link = await prisma.affiliateLink.create({
      data: {
        jobCategory,
        toolName,
        description,
        affiliateUrl,
        retailer: retailer || "AMAZON",
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json(link);
  } catch (err) {
    console.error("admin affiliate-links POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
