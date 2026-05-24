import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { sendEmail, emailIncidentReported, BASE } from "@/app/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const { jobId, severity, description } = await req.json();
  if (!jobId || !severity || !description) {
    return NextResponse.json({ error: "jobId, severity, and description required" }, { status: 400 });
  }

  const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: "severity must be LOW, MEDIUM, HIGH, or CRITICAL" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const incident = await prisma.safetyIncident.create({
    data: { jobId, reporterId: user.id, severity, description },
  });

  // Notify the other party and admin about the incident
  const jobFull = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      applications: { where: { status: "ACCEPTED" }, include: { worker: { select: { id: true, name: true, email: true } } } },
      poster: { select: { id: true, name: true, email: true } },
    },
  });
  const reporter = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  });

  let recipient: { name: string | null; email: string } | null = null;
  if (jobFull?.posterId === user.id && jobFull.applications[0]) {
    recipient = jobFull.applications[0].worker;
  } else if (jobFull?.applications[0]?.workerId === user.id) {
    recipient = jobFull.poster;
  }

  if (recipient?.email && reporter?.name) {
    await sendEmail({
      to: { email: recipient.email, name: recipient.name ?? undefined },
      ...emailIncidentReported({
        reporterName: reporter.name,
        jobTitle: jobFull?.title ?? "unknown job",
        severity,
        recipientName: recipient.name ?? "Recipient",
      }),
    });
  }

  // Also notify admin
  const adminConfig = await prisma.adminConfig.findUnique({ where: { key: "ADMIN_EMAIL" } });
  if (adminConfig?.value && jobFull && reporter) {
    await sendEmail({
      to: { email: adminConfig.value },
      subject: `Admin alert: ${severity} incident on "${jobFull.title}"`,
      html: BASE.replace("{title}", "Safety Incident Alert").replace("{body}",
        `Hi Admin,\n\n${reporter.name ?? "a user"} has reported a ${severity} severity incident on job "${jobFull.title}".\n\nDescription: ${description}\n\nPlease review and take appropriate action.`
      ),
    });
  }

  return NextResponse.json(incident, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const incidents = await prisma.safetyIncident.findMany({
    include: {
      job: { select: { id: true, title: true } },
      reporter: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(incidents);
}
