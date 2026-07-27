-- CreateEnum
CREATE TYPE "RecruitmentEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "RecruitmentPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "WorkforcePlanStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HiringReason" AS ENUM ('NEW_POSITION', 'REPLACEMENT', 'EXPANSION', 'TEMPORARY_REQUIREMENT');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RecruitmentStageName" AS ENUM ('WORKFORCE_PLANNING', 'JOB_REQUISITION', 'JOB_DESCRIPTION', 'APPROVAL', 'JOB_POSTING', 'APPLICATIONS', 'SCREENING', 'ASSESSMENT', 'INTERVIEWS', 'BACKGROUND_CHECK', 'OFFER', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ScreeningDecision" AS ENUM ('SHORTLIST', 'REJECT', 'HOLD', 'RECOMMEND');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('TECHNICAL_TEST', 'APTITUDE_TEST', 'PRACTICAL_EXERCISE', 'PSYCHOMETRIC_ASSESSMENT', 'COMPLIANCE_TEST');

-- CreateEnum
CREATE TYPE "AssessmentResult" AS ENUM ('PENDING', 'PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('HR_INTERVIEW', 'TECHNICAL_INTERVIEW', 'MANAGER_INTERVIEW', 'EXECUTIVE_INTERVIEW');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'CONSIDER', 'DO_NOT_HIRE');

-- CreateEnum
CREATE TYPE "BackgroundCheckType" AS ENUM ('EMPLOYMENT_VERIFICATION', 'EDUCATION_VERIFICATION', 'CRIMINAL_RECORD_CHECK', 'PROFESSIONAL_REFERENCES', 'IDENTITY_VERIFICATION');

-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OnboardingTaskType" AS ENUM ('EMPLOYEE_NUMBER_CREATED', 'SYSTEM_ACCOUNTS_CREATED', 'ID_CARD_ISSUED', 'LAPTOP_ASSIGNED', 'WORKSPACE_ASSIGNED', 'MANDATORY_AML_TRAINING_ASSIGNED', 'HR_ORIENTATION_SCHEDULED', 'MANAGER_ORIENTATION_SCHEDULED', 'DOCUMENTS_SIGNED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INTERVIEW_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'OFFER_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'OFFER_DECLINED';

-- CreateTable
CREATE TABLE "workforce_plans" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    "unitId" UUID,
    "branchId" UUID NOT NULL,
    "hiringManagerId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "numberOfPositions" INTEGER NOT NULL,
    "employmentType" "RecruitmentEmploymentType" NOT NULL,
    "priority" "RecruitmentPriority" NOT NULL DEFAULT 'MEDIUM',
    "expectedHiringDate" TIMESTAMP(3),
    "businessJustification" TEXT NOT NULL,
    "budget" INTEGER,
    "status" "WorkforcePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workforce_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_requisitions" (
    "id" UUID NOT NULL,
    "workforcePlanId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "unitId" UUID,
    "functionId" UUID NOT NULL,
    "bandId" UUID NOT NULL,
    "reportsToPositionId" UUID,
    "numberOfVacancies" INTEGER NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "branchId" UUID NOT NULL,
    "employmentType" "RecruitmentEmploymentType" NOT NULL,
    "hiringReason" "HiringReason" NOT NULL,
    "requestedById" TEXT NOT NULL,
    "hiringManagerId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "priority" "RecruitmentPriority" NOT NULL DEFAULT 'MEDIUM',
    "targetStartDate" TIMESTAMP(3),
    "jobDescriptionId" UUID,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" UUID NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobSummary" TEXT NOT NULL,
    "keyResponsibilities" TEXT NOT NULL,
    "requiredQualifications" TEXT NOT NULL,
    "requiredCertifications" TEXT,
    "requiredExperience" TEXT,
    "requiredSkills" TEXT,
    "technicalCompetencies" TEXT,
    "behaviouralCompetencies" TEXT,
    "requiredLevelId" UUID,
    "requiredBandId" UUID,
    "reportingManagerId" TEXT,
    "workLocation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_stage_instances" (
    "id" UUID NOT NULL,
    "requisitionId" UUID NOT NULL,
    "stage" "RecruitmentStageName" NOT NULL,
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "ownerId" TEXT,
    "status" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruitment_stage_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" UUID NOT NULL,
    "requisitionId" UUID NOT NULL,
    "postingTitle" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "closingDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "qualifications" TEXT NOT NULL,
    "branchId" UUID NOT NULL,
    "employmentType" "RecruitmentEmploymentType" NOT NULL,
    "requiredExperience" TEXT,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "cvUrl" TEXT,
    "coverLetterUrl" TEXT,
    "education" TEXT,
    "experience" TEXT,
    "certifications" TEXT,
    "skills" TEXT,
    "references" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "jobPostingId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiredEmployeeNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screenings" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "decision" "ScreeningDecision" NOT NULL,
    "comments" TEXT,
    "screenedById" TEXT NOT NULL,
    "screenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "score" INTEGER,
    "maxScore" INTEGER,
    "result" "AssessmentResult" NOT NULL DEFAULT 'PENDING',
    "evaluatorId" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "interviewType" "InterviewType" NOT NULL,
    "interviewDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "recommendation" "InterviewRecommendation",
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_panelists" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "interview_panelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_checks" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "checkType" "BackgroundCheckType" NOT NULL,
    "status" "BackgroundCheckStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "bandId" UUID NOT NULL,
    "proposedStartDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "offerLetterUrl" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_tasks" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "taskType" "OnboardingTaskType" NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_audit_logs" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruitment_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workforce_plans_departmentId_idx" ON "workforce_plans"("departmentId");

-- CreateIndex
CREATE INDEX "workforce_plans_status_idx" ON "workforce_plans"("status");

-- CreateIndex
CREATE INDEX "job_requisitions_departmentId_idx" ON "job_requisitions"("departmentId");

-- CreateIndex
CREATE INDEX "job_requisitions_branchId_idx" ON "job_requisitions"("branchId");

-- CreateIndex
CREATE INDEX "job_requisitions_status_idx" ON "job_requisitions"("status");

-- CreateIndex
CREATE INDEX "job_requisitions_recruiterId_idx" ON "job_requisitions"("recruiterId");

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_stage_instances_requisitionId_stage_key" ON "recruitment_stage_instances"("requisitionId", "stage");

-- CreateIndex
CREATE INDEX "job_postings_requisitionId_idx" ON "job_postings"("requisitionId");

-- CreateIndex
CREATE INDEX "job_postings_status_idx" ON "job_postings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "applications_hiredEmployeeNumber_key" ON "applications"("hiredEmployeeNumber");

-- CreateIndex
CREATE INDEX "applications_jobPostingId_status_idx" ON "applications"("jobPostingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidateId_jobPostingId_key" ON "applications"("candidateId", "jobPostingId");

-- CreateIndex
CREATE UNIQUE INDEX "screenings_applicationId_key" ON "screenings"("applicationId");

-- CreateIndex
CREATE INDEX "assessments_applicationId_idx" ON "assessments"("applicationId");

-- CreateIndex
CREATE INDEX "interviews_applicationId_idx" ON "interviews"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_panelists_interviewId_employeeId_key" ON "interview_panelists"("interviewId", "employeeId");

-- CreateIndex
CREATE INDEX "background_checks_applicationId_idx" ON "background_checks"("applicationId");

-- CreateIndex
CREATE INDEX "offers_applicationId_idx" ON "offers"("applicationId");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_tasks_applicationId_taskType_key" ON "onboarding_tasks"("applicationId", "taskType");

-- CreateIndex
CREATE INDEX "recruitment_audit_logs_entityType_entityId_createdAt_idx" ON "recruitment_audit_logs"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "workforce_plans" ADD CONSTRAINT "workforce_plans_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plans" ADD CONSTRAINT "workforce_plans_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plans" ADD CONSTRAINT "workforce_plans_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plans" ADD CONSTRAINT "workforce_plans_hiringManagerId_fkey" FOREIGN KEY ("hiringManagerId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plans" ADD CONSTRAINT "workforce_plans_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_plans" ADD CONSTRAINT "workforce_plans_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_workforcePlanId_fkey" FOREIGN KEY ("workforcePlanId") REFERENCES "workforce_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_reportsToPositionId_fkey" FOREIGN KEY ("reportsToPositionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "functions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "bands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_hiringManagerId_fkey" FOREIGN KEY ("hiringManagerId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_requiredLevelId_fkey" FOREIGN KEY ("requiredLevelId") REFERENCES "position_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_requiredBandId_fkey" FOREIGN KEY ("requiredBandId") REFERENCES "bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_stage_instances" ADD CONSTRAINT "recruitment_stage_instances_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "job_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_stage_instances" ADD CONSTRAINT "recruitment_stage_instances_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "job_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_hiredEmployeeNumber_fkey" FOREIGN KEY ("hiredEmployeeNumber") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_screenedById_fkey" FOREIGN KEY ("screenedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_panelists" ADD CONSTRAINT "interview_panelists_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_panelists" ADD CONSTRAINT "interview_panelists_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_checks" ADD CONSTRAINT "background_checks_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "bands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_audit_logs" ADD CONSTRAINT "recruitment_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;
