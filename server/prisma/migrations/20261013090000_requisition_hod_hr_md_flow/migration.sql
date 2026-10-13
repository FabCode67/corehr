-- Head of Department -> HR review -> MD approval flow
ALTER TYPE "RequisitionStatus" ADD VALUE IF NOT EXISTS 'PENDING_HR_REVIEW';
ALTER TYPE "RequisitionStatus" ADD VALUE IF NOT EXISTS 'PENDING_MD_APPROVAL';

ALTER TABLE "job_requisitions" ALTER COLUMN "workforcePlanId" DROP NOT NULL;
ALTER TABLE "job_requisitions" ADD COLUMN "justification" TEXT;
ALTER TABLE "job_requisitions" ADD COLUMN "hrReviewedById" TEXT;
ALTER TABLE "job_requisitions" ADD COLUMN "hrReviewedAt" TIMESTAMP(3);
ALTER TABLE "job_requisitions" ADD COLUMN "hrComment" TEXT;
