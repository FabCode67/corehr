-- Adds isBudgeted/memoUrl to Course and WorkforcePlan. These supersede the
-- old numeric cost/budget fields as what the New Course / New Workforce Plan
-- forms collect going forward. cost/budget are left untouched (nullable,
-- unused by new UI) so historical data and the existing Cost Analysis /
-- Budget by Department reports and AI assistant tool keep working.

-- AlterTable
ALTER TABLE "courses" ADD COLUMN "isBudgeted" BOOLEAN;
ALTER TABLE "courses" ADD COLUMN "memoUrl" TEXT;

-- AlterTable
ALTER TABLE "workforce_plans" ADD COLUMN "isBudgeted" BOOLEAN;
ALTER TABLE "workforce_plans" ADD COLUMN "memoUrl" TEXT;
