import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonBody } from "@/app/lib/api-json";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; role: string };

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      workerProfile: true,
      posterProfile: true,
      competencyScore: true,
      riskScore: true,
      userLevel: true,
    },
    omit: { passwordHash: true },
  });

  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; role: string };

  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const { name, bio, phone, location, avatarUrl } = body;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(bio !== undefined && { bio }),
      ...(phone !== undefined && { phone }),
      ...(location !== undefined && { location }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
    omit: { passwordHash: true },
  });

  // Upsert role-specific profile
  if (user.role === "WORKER") {
    const { skills, availability, hourlyRate } = body;
    await prisma.workerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, skills: skills ?? [], availability, hourlyRate },
      update: {
        ...(skills !== undefined && { skills }),
        ...(availability !== undefined && { availability }),
        ...(hourlyRate !== undefined && { hourlyRate }),
      },
    });
  } else if (user.role === "POSTER") {
    const { companyName, website } = body;
    await prisma.posterProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, companyName, bio, website },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(website !== undefined && { website }),
      },
    });
  }

  return NextResponse.json(updated);
}
