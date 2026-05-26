import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { validateJobCreateInput } from "@/app/lib/jobInputValidation";
import { prisma } from "@/app/lib/prisma";
import { JobStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const status = searchParams.get("status") as JobStatus | null;

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (status) where.status = status;
  else where.status = "OPEN";

  const jobs = await prisma.job.findMany({
    where,
    include: { poster: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (user.role !== "POSTER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only posters can create jobs" }, { status: 403 });
  }

  const validation = validateJobCreateInput(await req.json());
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { title, description, category, location, payRate, payUnit, startDate, endDate, publish } =
    validation.data;

  const job = await prisma.job.create({
    data: {
      title,
      description,
      category,
      location,
      payRate,
      payUnit,
      startDate,
      endDate,
      status: publish ? "OPEN" : "DRAFT",
      posterId: user.id,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
