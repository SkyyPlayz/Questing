import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonBody } from "@/app/lib/api-json";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const configs = await prisma.adminConfig.findMany();
  const flat = configs.reduce((acc, c) => {
    acc[c.key] = c.value;
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json(flat);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  if (!body.key || !body.value) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const validKeys = ["PLATFORM_FEE_PERCENT", "BACKGROUND_CHECK_FEE_CENTS"];
  if (!validKeys.includes(body.key)) {
    return NextResponse.json({ error: `Invalid key. Must be one of: ${validKeys.join(", ")}` }, { status: 400 });
  }

  // Validate values
  if (body.key === "PLATFORM_FEE_PERCENT") {
    const pct = parseFloat(body.value);
    if (isNaN(pct) || pct < 0 || pct > 1) {
      return NextResponse.json({ error: "PLATFORM_FEE_PERCENT must be a number between 0 and 1" }, { status: 400 });
    }
  }

  if (body.key === "BACKGROUND_CHECK_FEE_CENTS") {
    const cents = parseInt(body.value, 10);
    if (isNaN(cents) || cents < 0) {
      return NextResponse.json({ error: "BACKGROUND_CHECK_FEE_CENTS must be a non-negative integer" }, { status: 400 });
    }
  }

  const config = await prisma.adminConfig.upsert({
    where: { key: body.key },
    update: { value: body.value },
    create: { key: body.key, value: body.value },
  });

  return NextResponse.json(config);
}
