-- Store the Stripe Checkout Session used to create each background check fee so
-- webhooks can reconcile one paid checkout to one fee row.
ALTER TABLE "BackgroundCheckFee"
ADD COLUMN "stripeCheckoutSessionId" TEXT;

CREATE UNIQUE INDEX "BackgroundCheckFee_stripeCheckoutSessionId_key"
ON "BackgroundCheckFee"("stripeCheckoutSessionId");

WITH ranked_pending AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "workerId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "BackgroundCheckFee"
  WHERE "status" = 'PENDING'
)
UPDATE "BackgroundCheckFee"
SET "status" = 'VOIDED'
WHERE "id" IN (
  SELECT "id"
  FROM ranked_pending
  WHERE row_number > 1
);

-- Only one active background-check checkout should be pending for a worker.
CREATE UNIQUE INDEX "BackgroundCheckFee_one_pending_per_worker_idx"
ON "BackgroundCheckFee"("workerId")
WHERE "status" = 'PENDING';
