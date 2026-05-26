import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { buildPublicJobsQuery } from "@/app/lib/publicJobsQuery";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  const jobs = await prisma.job.findMany(buildPublicJobsQuery({ category, status }));

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

  const body = await req.json();
  const { title, description, category, location, payRate, payUnit, startDate, endDate, publish } = body;

  if (!title || !description || !category || !location || !payRate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      title,
      description,
      category,
      location,
      payRate: parseFloat(payRate),
      payUnit: payUnit || "hour",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: publish ? "OPEN" : "DRAFT",
      posterId: user.id,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
