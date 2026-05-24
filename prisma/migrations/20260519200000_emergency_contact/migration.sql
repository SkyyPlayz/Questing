-- Add emergency contact fields to WorkerProfile
ALTER TABLE "WorkerProfile" ADD COLUMN "emergencyContact" TEXT;
ALTER TABLE "WorkerProfile" ADD COLUMN "emergencyContactPhone" TEXT;
ALTER TABLE "WorkerProfile" ADD COLUMN "onboardingComplete" BOOLEAN DEFAULT FALSE;
