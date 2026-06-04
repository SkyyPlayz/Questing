import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonBody } from "@/app/lib/api-json";
import { prisma } from "@/app/lib/prisma";
import { createIntakeRun, intakeCandidateSelect, requireAdmin } from "@/app/lib/github-intake";

export async function GET() {
  const session = await auth();
  const guard = requireAdmin(session?.user as { id?: string; role?: string } | undefined);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const runs = await prisma.gitHubIntakeRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { candidates: { select: intakeCandidateSelect, orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const guard = requireAdmin(user);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const run = await createIntakeRun({
    source: "manual-admin",
    dryRun: body.dryRun !== false,
    requestedById: user?.id,
    findings: Array.isArray(body.findings) ? body.findings : [],
  });

  return NextResponse.json(run, { status: 201 });
}
