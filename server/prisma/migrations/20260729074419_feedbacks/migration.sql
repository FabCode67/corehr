-- CreateEnum
CREATE TYPE "LeaveAttachmentPurpose" AS ENUM ('SUBMISSION', 'CANCELLATION');

-- CreateEnum
CREATE TYPE "OnboardingDocumentCategory" AS ENUM ('IDENTIFICATION', 'EMPLOYMENT', 'COMPLIANCE', 'FINANCIAL', 'MEDICAL', 'IT', 'ASSET', 'OTHER');

-- CreateEnum
CREATE TYPE "OnboardingDocumentStatus" AS ENUM ('NOT_STARTED', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ONBOARDING_DOCUMENT_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'ONBOARDING_DOCUMENT_UPLOADED';
ALTER TYPE "NotificationType" ADD VALUE 'ONBOARDING_DOCUMENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'ONBOARDING_DOCUMENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'ONBOARDING_DOCUMENT_RESUBMISSION_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_CARRY_FORWARD_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'EXIT_PROCESS_STARTED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "exitInitiatedAt" TIMESTAMP(3),
ADD COLUMN     "exitInitiatedById" TEXT,
ADD COLUMN     "previousBankingExperienceYears" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "leave_carry_forward_rules" ADD COLUMN     "autoExpiryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "exemptDepartmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "exemptEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT;

-- AlterTable
ALTER TABLE "leave_types" ADD COLUMN     "excludePublicHolidaysOverride" BOOLEAN,
ADD COLUMN     "excludeWeekendsOverride" BOOLEAN;

-- AlterTable
ALTER TABLE "performance_rating_scales" ADD COLUMN     "expectedPercentage" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "leave_attachment_requirements" (
    "id" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_attachment_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request_attachments" (
    "id" UUID NOT NULL,
    "leaveRequestId" UUID NOT NULL,
    "requirementId" UUID,
    "purpose" "LeaveAttachmentPurpose" NOT NULL DEFAULT 'SUBMISSION',
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_document_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "OnboardingDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "applicableContractTypes" "ContractType"[],
    "applicableFunctionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableDepartmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicablePositionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableBandIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "effectiveDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_document_assignments" (
    "id" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentTypeId" UUID NOT NULL,
    "status" "OnboardingDocumentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "fileUrl" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_document_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_attachment_requirements_leaveTypeId_name_key" ON "leave_attachment_requirements"("leaveTypeId", "name");

-- CreateIndex
CREATE INDEX "leave_request_attachments_leaveRequestId_idx" ON "leave_request_attachments"("leaveRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_document_types_name_key" ON "onboarding_document_types"("name");

-- CreateIndex
CREATE INDEX "onboarding_document_assignments_employeeId_status_idx" ON "onboarding_document_assignments"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_document_assignments_employeeId_documentTypeId_key" ON "onboarding_document_assignments"("employeeId", "documentTypeId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_exitInitiatedById_fkey" FOREIGN KEY ("exitInitiatedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_attachment_requirements" ADD CONSTRAINT "leave_attachment_requirements_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_attachments" ADD CONSTRAINT "leave_request_attachments_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_attachments" ADD CONSTRAINT "leave_request_attachments_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "leave_attachment_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_document_assignments" ADD CONSTRAINT "onboarding_document_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_document_assignments" ADD CONSTRAINT "onboarding_document_assignments_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "onboarding_document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_document_assignments" ADD CONSTRAINT "onboarding_document_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_document_assignments" ADD CONSTRAINT "onboarding_document_assignments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;
