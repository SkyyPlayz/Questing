import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const [openJobs, pendingVerifications, openIncidents, openDisputes] = await Promise.all([
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.user.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.safetyIncident.count({ where: { status: "OPEN" } }),
    prisma.dispute.count({ where: { status: "OPEN" } }),
  ]);

  return NextResponse.json({ openJobs, pendingVerifications, openIncidents, openDisputes });
}
