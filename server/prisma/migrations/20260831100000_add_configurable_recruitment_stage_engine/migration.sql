-- Configurable Candidate Pipeline ("ATS stage engine") — see the schema's
-- module doc comment above RecruitmentStageType for why this is a separate
-- model family from RecruitmentStageInstance/RecruitmentStageName (which
-- track a requisition's own fixed 12-phase project timeline, untouched by
-- this migration).

-- CreateEnum
CREATE TYPE "RecruitmentStageType" AS ENUM ('SCREENING', 'REVIEW', 'TEST', 'INTERVIEW', 'ASSESSMENT_CENTRE', 'DECISION', 'OFFER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ApplicationStageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'ON_HOLD', 'SKIPPED');

-- CreateTable
CREATE TABLE "recruitment_stage_definitions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stageType" "RecruitmentStageType" NOT NULL,
    "isScored" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrderHint" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruitment_stage_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_stage_definitions_key_key" ON "recruitment_stage_definitions"("key");

-- CreateTable
CREATE TABLE "recruitment_workflows" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minBandRank" INTEGER,
    "maxBandRank" INTEGER,
    "contractTypes" "ContractType"[] DEFAULT ARRAY[]::"ContractType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruitment_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_workflows_name_key" ON "recruitment_workflows"("name");

-- CreateTable
CREATE TABLE "recruitment_workflow_stages" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recruitment_workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_workflow_stages_workflowId_stageId_key" ON "recruitment_workflow_stages"("workflowId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_workflow_stages_workflowId_sequence_key" ON "recruitment_workflow_stages"("workflowId", "sequence");

-- CreateTable
CREATE TABLE "recruitment_scoring_criteria" (
    "id" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxScore" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recruitment_scoring_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_scoring_criteria_stageId_name_key" ON "recruitment_scoring_criteria"("stageId", "name");

-- CreateTable
CREATE TABLE "application_stage_instances" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "ApplicationStageStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_stage_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_stage_instances_applicationId_stageId_key" ON "application_stage_instances"("applicationId", "stageId");

-- CreateIndex
CREATE INDEX "application_stage_instances_applicationId_idx" ON "application_stage_instances"("applicationId");

-- CreateTable
CREATE TABLE "application_stage_scores" (
    "id" UUID NOT NULL,
    "stageInstanceId" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "scoredById" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_stage_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_stage_scores_stageInstanceId_criterionId_key" ON "application_stage_scores"("stageInstanceId", "criterionId");

-- AlterTable: Application gets a workflow pointer, a current-stage pointer, and a rollup score
ALTER TABLE "applications" ADD COLUMN "workflowId" UUID;
ALTER TABLE "applications" ADD COLUMN "currentStageId" UUID;
ALTER TABLE "applications" ADD COLUMN "overallScore" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "recruitment_workflow_stages" ADD CONSTRAINT "recruitment_workflow_stages_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "recruitment_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_workflow_stages" ADD CONSTRAINT "recruitment_workflow_stages_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "recruitment_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_scoring_criteria" ADD CONSTRAINT "recruitment_scoring_criteria_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "recruitment_stage_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_instances" ADD CONSTRAINT "application_stage_instances_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_stage_instances" ADD CONSTRAINT "application_stage_instances_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "recruitment_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_stage_instances" ADD CONSTRAINT "application_stage_instances_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_scores" ADD CONSTRAINT "application_stage_scores_stageInstanceId_fkey" FOREIGN KEY ("stageInstanceId") REFERENCES "application_stage_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_stage_scores" ADD CONSTRAINT "application_stage_scores_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "recruitment_scoring_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_stage_scores" ADD CONSTRAINT "application_stage_scores_scoredById_fkey" FOREIGN KEY ("scoredById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "recruitment_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "recruitment_stage_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
