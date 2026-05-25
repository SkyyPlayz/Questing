-- Add an explicit participant worker for private chat threads.
ALTER TABLE "ChatThread" ADD COLUMN "privateWorkerId" TEXT;

-- Backfill legacy private threads when a job has exactly one accepted worker.
UPDATE "ChatThread" ct
SET "privateWorkerId" = accepted."workerId"
FROM (
    SELECT "jobId", MIN("workerId") AS "workerId"
    FROM "Application"
    WHERE "status" IN ('ACCEPTED', 'FCFS_ACCEPTED')
    GROUP BY "jobId"
    HAVING COUNT(*) = 1
) accepted
WHERE ct."jobId" = accepted."jobId"
  AND ct."threadType" = 'PRIVATE'
  AND ct."privateWorkerId" IS NULL;

-- One private thread per worker per job. PostgreSQL allows multiple NULLs, so
-- unresolved legacy threads remain visible to posters but not workers.
CREATE UNIQUE INDEX "ChatThread_jobId_privateWorkerId_private_key"
ON "ChatThread"("jobId", "privateWorkerId")
WHERE "threadType" = 'PRIVATE' AND "privateWorkerId" IS NOT NULL;

CREATE INDEX "ChatThread_jobId_threadType_privateWorkerId_idx"
ON "ChatThread"("jobId", "threadType", "privateWorkerId");

ALTER TABLE "ChatThread"
ADD CONSTRAINT "ChatThread_privateWorkerId_fkey"
FOREIGN KEY ("privateWorkerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
