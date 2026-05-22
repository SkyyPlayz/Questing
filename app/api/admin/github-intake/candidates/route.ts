import { GitHubIntakeCandidateStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { intakeCandidateSelect, requireAdmin } from "@/app/lib/github-intake";

export async function GET(req: NextRequest) {
  const session = await auth();
  const guard = requireAdmin(session?.user as { id?: string; role?: string } | undefined);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.toUpperCase();
  const isCandidateStatus = (value: string): value is GitHubIntakeCandidateStatus => value in GitHubIntakeCandidateStatus;
  const where = status && isCandidateStatus(status) ? { status } : undefined;
  const candidates = await prisma.gitHubIntakeCandidate.findMany({
    where,
    select: intakeCandidateSelect,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(candidates);
}
