import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createGitHubIssueForCandidate, requireAdmin } from "@/app/lib/github-intake";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const guard = requireAdmin(user);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  try {
    const candidate = await createGitHubIssueForCandidate(id, user?.id);
    return NextResponse.json(candidate);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub filing failed" }, { status: 400 });
  }
}
