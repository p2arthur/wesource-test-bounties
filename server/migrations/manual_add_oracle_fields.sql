-- Migration: Add Oracle Validation Fields
-- Description: Adds tracking fields for the Oracle validation service to prevent double processing
--              and optimize GitHub API usage with If-Modified-Since headers

-- Add new columns to Bounty table
ALTER TABLE "Bounty" ADD COLUMN "processed_event_id" BIGINT;
ALTER TABLE "Bounty" ADD COLUMN "last_checked_at" TIMESTAMP(3);
ALTER TABLE "Bounty" ADD COLUMN "state_reason" TEXT;
ALTER TABLE "Bounty" ADD COLUMN "closed_by_commit_id" TEXT;

-- Add new status values to BountyStatus enum
ALTER TYPE "BountyStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "BountyStatus" ADD VALUE IF NOT EXISTS 'REFUNDABLE';

-- Add comments for documentation
COMMENT ON COLUMN "Bounty"."processed_event_id" IS 'GitHub event ID to prevent double processing';
COMMENT ON COLUMN "Bounty"."last_checked_at" IS 'Timestamp for If-Modified-Since header optimization';
COMMENT ON COLUMN "Bounty"."state_reason" IS 'GitHub issue state_reason: completed, not_planned, etc.';
COMMENT ON COLUMN "Bounty"."closed_by_commit_id" IS 'Commit SHA that closed the issue (for verification)';
