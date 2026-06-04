import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/app/lib/api-json";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody.response;
  const { location, skills } = parsedBody.data;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { ...(location && { location }) },
    }),
    prisma.workerProfile.upsert({
      where: { userId: user.id },
      update: {
        onboardingComplete: true,
        ...(skills && { skills }),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        onboardingComplete: true,
        skills: skills ?? [],
        updatedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const profile = await prisma.workerProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ onboardingComplete: profile?.onboardingComplete ?? false });
}
