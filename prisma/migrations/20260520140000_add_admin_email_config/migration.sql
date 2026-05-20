-- Create AdminConfigKey enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "AdminConfigKey" AS ENUM ('PLATFORM_FEE_PERCENT', 'BACKGROUND_CHECK_FEE_CENTS');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add ADMIN_EMAIL to AdminConfigKey enum
ALTER TYPE "AdminConfigKey" ADD VALUE 'ADMIN_EMAIL';