import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user as { role: string };
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      workerProfile: true,
      posterProfile: true,
      competencyScore: true,
      riskScore: true,
      ratingsReceived: { include: { fromUser: { select: { id: true, name: true } } } },
      incidents: true,
      adminNotes: { orderBy: { createdAt: "desc" } },
    },
    omit: { passwordHash: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user as { id: string; role: string };
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { status, note, idVerified, backgroundCheckStatus, riskLevel, riskOverrideNote } = body;

  const ops: Promise<unknown>[] = [];

  if (status) {
    ops.push(prisma.user.update({ where: { id }, data: { status } }));
  }

  if (note) {
    ops.push(prisma.adminNote.create({ data: { userId: id, note, authorId: actor.id } }));
  }

  if (idVerified !== undefined || backgroundCheckStatus !== undefined) {
    ops.push(
      prisma.workerProfile.upsert({
        where: { userId: id },
        create: { userId: id, ...(idVerified !== undefined && { idVerified }), ...(backgroundCheckStatus && { backgroundCheckStatus }) },
        update: { ...(idVerified !== undefined && { idVerified }), ...(backgroundCheckStatus && { backgroundCheckStatus }) },
      })
    );
  }

  if (riskLevel) {
    ops.push(
      prisma.riskScore.upsert({
        where: { userId: id },
        create: { userId: id, riskLevel, overrideNote: riskOverrideNote },
        update: { riskLevel, overrideNote: riskOverrideNote },
      })
    );
  }

  await Promise.all(ops);

  const updated = await prisma.user.findUnique({
    where: { id },
    include: { workerProfile: true, riskScore: true },
    omit: { passwordHash: true },
  });

  return NextResponse.json(updated);
}
