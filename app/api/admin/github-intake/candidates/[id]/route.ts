import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { requireAdmin, reviewCandidate } from "@/app/lib/github-intake";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const guard = requireAdmin(user);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const body = await req.json();

  try {
    const candidate = await reviewCandidate({
      id,
      action: body.action,
      reviewedById: user?.id,
      reviewNote: body.reviewNote,
    });
    return NextResponse.json(candidate);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Review failed" }, { status: 400 });
  }
}
