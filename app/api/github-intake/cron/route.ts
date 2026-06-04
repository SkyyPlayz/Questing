import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/app/lib/api-json";
import { createIntakeRun } from "@/app/lib/github-intake";

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.GITHUB_INTAKE_CRON_SECRET;
  const providedSecret = req.headers.get("x-github-intake-secret") ?? new URL(req.url).searchParams.get("secret");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const run = await createIntakeRun({
    source: "scheduled-cron",
    dryRun: true,
    findings: Array.isArray(body.findings) ? body.findings : [],
  });

  return NextResponse.json(run, { status: 201 });
}
