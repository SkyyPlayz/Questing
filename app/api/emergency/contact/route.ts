import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonBody } from "@/app/lib/api-json";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role?: string };
  if (user.role !== "WORKER") {
    return NextResponse.json({ error: "Workers only" }, { status: 403 });
  }

  const profile = await prisma.workerProfile.findUnique({
    where: { userId: user.id },
    select: { emergencyContact: true, emergencyContactPhone: true },
  });

  return NextResponse.json(profile || { emergencyContact: null, emergencyContactPhone: null });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role?: string };
  if (user.role !== "WORKER") {
    return NextResponse.json({ error: "Workers only" }, { status: 403 });
  }

  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const { emergencyContact, emergencyContactPhone } = body;

  if (emergencyContact && emergencyContact.length > 100) {
    return NextResponse.json({ error: "Contact name too long" }, { status: 400 });
  }
  if (emergencyContactPhone && emergencyContactPhone.length > 20) {
    return NextResponse.json({ error: "Phone number too long" }, { status: 400 });
  }

  const profile = await prisma.workerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      skills: [],
      emergencyContact: emergencyContact || null,
      emergencyContactPhone: emergencyContactPhone || null,
    },
    update: {
      ...(emergencyContact !== undefined && { emergencyContact }),
      ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
    },
  });

  return NextResponse.json(profile, { status: 200 });
}
