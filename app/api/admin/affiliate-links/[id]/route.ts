import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

// PATCH /api/admin/affiliate-links/{id}
// Admin update affiliate link
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const body = await request.json();
    const link = await prisma.affiliateLink.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(link);
  } catch (err) {
    console.error("admin affiliate-links PATCH error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/admin/affiliate-links/{id}
// Admin delete affiliate link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    await prisma.affiliateLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin affiliate-links DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
