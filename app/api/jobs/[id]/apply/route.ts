import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { awardXP } from "@/app/lib/xp";
import { sendEmail, emailApplicationSubmitted, emailApplicationAccepted, emailApplicationRejected } from "@/app/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };
  if (user.role !== "WORKER") {
    return NextResponse.json({ error: "Only workers can apply" }, { status: 403 });
  }

  const { id } = await params;
  let job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "OPEN") {
    return NextResponse.json({ error: "Job is not open for applications" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { message } = body;

  const existing = await prisma.application.findUnique({
    where: { jobId_workerId: { jobId: id, workerId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already applied" }, { status: 409 });
  }

  // FCFS check: only apply if job uses FCFS mode
  if (job.fcfsMode === true) {
    // FCFS timeout enforcement: if the lock has expired, auto-reopen the job
    if (job.fcfsLockedAt != null && job.fcfsTimeoutMinutes != null) {
      const lockAgeMinutes = (Date.now() - job.fcfsLockedAt.getTime()) / 60000;
      if (lockAgeMinutes > job.fcfsTimeoutMinutes) {
        // Lock expired — reopen job, reject FCFS app, clear lock
        await prisma.$transaction([
          prisma.application.updateMany({
            where: { jobId: id, status: "FCFS_ACCEPTED" },
            data: { status: "REJECTED" },
          }),
          prisma.job.update({
            where: { id },
            data: { status: "OPEN", fcfsLockedAt: null },
          }),
        ]);
        // Refresh job state after reopening
        job = await prisma.job.findUnique({ where: { id } });
      }
    }

    const otherApps = await prisma.application.findMany({
      where: { jobId: id, status: { in: ["PENDING", "FCFS_ACCEPTED"] } },
    });

    if (otherApps.length === 0) {
      // First applicant — auto-lock the job (FCFS)
      const application = await prisma.application.create({
        data: {
          jobId: id,
          workerId: user.id,
          message: message || null,
          status: "FCFS_ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      // Move job to IN_PROGRESS and set FCFS lock timestamp
      await prisma.job.update({
        where: { id },
        data: { status: "IN_PROGRESS", fcfsLockedAt: new Date() },
      });

      // Auto-create PRIVATE chat thread between poster and FCFS worker
      await prisma.chatThread.create({
        data: { jobId: id, threadType: "PRIVATE" },
      });

      await awardXP(user.id, "JOB_ACCEPTED", id);

      // Send acceptance email to FCFS worker
      const worker = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } });
      const poster = await prisma.user.findUnique({ where: { id: job.posterId }, select: { name: true, email: true } });
      if (worker && poster) {
        await sendEmail(emailApplicationAccepted({
          workerName: worker.name ?? "there",
          jobTitle: job.title,
          posterName: poster.name ?? "the poster",
        }));
      }

      return NextResponse.json({
        ...application,
        jobStatus: "IN_PROGRESS",
        fcfsLocked: true,
      }, { status: 201 });
    }

    // Job already has an FCFS applicant — new application goes as PENDING for poster review
    const application = await prisma.application.create({
      data: { jobId: id, workerId: user.id, message: message || null },
    });

    // Send application submitted email to poster
    const poster = await prisma.user.findUnique({ where: { id: job.posterId }, select: { name: true, email: true } });
    if (poster) {
      await sendEmail(emailApplicationSubmitted({
        workerName: user.name ?? "a worker",
        jobTitle: job.title,
        posterName: poster.name ?? "the poster",
      }));
    }

    return NextResponse.json(application, { status: 201 });
  }

  // Poster-review mode: all applications go as PENDING
  const application = await prisma.application.create({
    data: { jobId: id, workerId: user.id, message: message || null },
  });

  // Send application submitted email to poster
  const poster = await prisma.user.findUnique({ where: { id: job.posterId }, select: { name: true, email: true } });
  if (poster) {
    await sendEmail(emailApplicationSubmitted({
      workerName: user.name ?? "a worker",
      jobTitle: job.title,
      posterName: poster.name ?? "the poster",
    }));
  }

  return NextResponse.json(application, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role: string };

  const { id } = await params;
  const body = await req.json();
  const { applicationId, action } = body;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.posterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!application || application.jobId !== id) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (action === "accept") {
    // Only allowed for PENDING apps when job is still OPEN (non-FCFS fallback)
    if (application.status !== "PENDING" || job.status !== "OPEN") {
      return NextResponse.json({ error: "Cannot accept — job is FCFS-locked or application not pending" }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.application.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED" },
      }),
      prisma.application.updateMany({
        where: { jobId: id, id: { not: applicationId } },
        data: { status: "REJECTED" },
      }),
      prisma.job.update({
        where: { id },
        data: { status: "IN_PROGRESS", fcfsLockedAt: null },
      }),
      prisma.chatThread.create({
        data: { jobId: id, threadType: "PRIVATE" },
      }),
    ]);
    await awardXP(application.workerId, "JOB_ACCEPTED", id);

    // Send acceptance email to worker
    const worker = await prisma.user.findUnique({ where: { id: application.workerId }, select: { name: true, email: true } });
    const poster = await prisma.user.findUnique({ where: { id: job.posterId }, select: { name: true } });
    if (worker && poster) {
      await sendEmail(emailApplicationAccepted({
        workerName: worker.name ?? "there",
        jobTitle: job.title,
        posterName: poster.name ?? "the poster",
      }));
    }

    // Send rejection emails to other workers
    const rejectedApps = await prisma.application.findMany({
      where: { jobId: id, id: { not: applicationId }, status: "REJECTED" },
      include: { worker: { select: { name: true, email: true } } },
    });
    for (const app of rejectedApps) {
      await sendEmail(emailApplicationRejected({
        workerName: app.worker.name ?? "there",
        jobTitle: job.title,
        posterName: poster.name ?? "the poster",
      }));
    }
  } else if (action === "reject") {
    // Only allowed for PENDING apps when job is still OPEN
    if (application.status !== "PENDING" || job.status !== "OPEN") {
      return NextResponse.json({ error: "Cannot reject — job is FCFS-locked or application not pending" }, { status: 400 });
    }
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: "REJECTED" },
    });

    // Send rejection email to worker
    const worker = await prisma.user.findUnique({ where: { id: application.workerId }, select: { name: true, email: true } });
    const poster = await prisma.user.findUnique({ where: { id: job.posterId }, select: { name: true } });
    if (worker && poster) {
      await sendEmail(emailApplicationRejected({
        workerName: worker.name ?? "there",
        jobTitle: job.title,
        posterName: poster.name ?? "the poster",
      }));
    }
  } else if (action === "withdraw") {
    // Worker can withdraw their pending application
    if (application.workerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (application.status !== "PENDING") {
      return NextResponse.json({ error: "Cannot withdraw — application not pending" }, { status: 400 });
    }
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: "WITHDRAWN" },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updatedJob = await prisma.job.findUnique({
    where: { id },
    include: {
      applications: {
        include: { worker: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(updatedJob);
}
