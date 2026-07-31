-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'COMMENTS', 'NUMBER', 'AMOUNT', 'PERCENTAGE', 'DATE', 'DATE_RANGE', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'MULTI_SELECT', 'EMPLOYEE_SELECT', 'DEPARTMENT_SELECT', 'POSITION_SELECT', 'MANAGER_SELECT', 'FILE_UPLOAD', 'CERTIFICATE_UPLOAD', 'ATTACHMENT_UPLOAD', 'APPROVAL_DECISION', 'RECOMMENDATION', 'TABLE');

-- CreateEnum
CREATE TYPE "SignerRole" AS ENUM ('EMPLOYEE', 'MANAGER', 'HEAD_OF_DEPARTMENT', 'HR', 'EXECUTIVE_MANAGEMENT', 'SPECIFIC_APPROVER');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED', 'RETURNED_FOR_CORRECTION');

-- CreateEnum
CREATE TYPE "FormInstanceStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'PENDING_SIGNATURES', 'REJECTED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DisciplinaryCaseCategory" AS ENUM ('MISCONDUCT', 'ATTENDANCE', 'INSUBORDINATION', 'HARASSMENT', 'DISCRIMINATION', 'FRAUD', 'POLICY_VIOLATION', 'SAFETY_VIOLATION', 'PERFORMANCE_ISSUE', 'CONFIDENTIALITY_BREACH', 'OTHER');

-- CreateEnum
CREATE TYPE "DisciplinaryCaseStatus" AS ENUM ('DRAFT', 'UNDER_INVESTIGATION', 'PENDING_DECISION', 'SANCTION_ISSUED', 'CLOSED', 'APPEALED');

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GrievanceCategory" AS ENUM ('WORKPLACE_CONFLICT', 'HARASSMENT', 'DISCRIMINATION', 'COMPENSATION', 'WORKING_CONDITIONS', 'MANAGEMENT_CONDUCT', 'POLICY_DISPUTE', 'OTHER');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'DECIDED');

-- CreateEnum
CREATE TYPE "AppealOutcome" AS ENUM ('UPHELD', 'OVERTURNED', 'MODIFIED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'FORM_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'FORM_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'FORM_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'FORM_SIGNATURE_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE 'FORM_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'FORM_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'FORM_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'ERC_MEETING_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'ERC_DECISION_ISSUED';
ALTER TYPE "NotificationType" ADD VALUE 'ERC_APPEAL_DECIDED';
ALTER TYPE "NotificationType" ADD VALUE 'ERC_MANAGER_INPUT_NEEDED';
ALTER TYPE "NotificationType" ADD VALUE 'ERC_INVESTIGATION_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'ERC_APPEAL_SUBMITTED';

-- CreateTable
CREATE TABLE "form_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "formCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purpose" TEXT,
    "categoryId" UUID NOT NULL,
    "requirementsInstructions" TEXT,
    "applicableDepartmentId" UUID,
    "applicableEmployeeCategory" TEXT,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "rootTemplateId" UUID,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" UUID NOT NULL,
    "formTemplateId" UUID NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" JSONB,
    "tableColumns" JSONB,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_signature_stages" (
    "id" UUID NOT NULL,
    "formTemplateId" UUID NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "role" "SignerRole" NOT NULL,
    "specificApproverId" TEXT,
    "label" TEXT,

    CONSTRAINT "form_signature_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_instances" (
    "id" UUID NOT NULL,
    "formTemplateId" UUID NOT NULL,
    "formVersion" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "instructions" TEXT,
    "priority" "FormPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FormInstanceStatus" NOT NULL DEFAULT 'ASSIGNED',
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_field_responses" (
    "id" UUID NOT NULL,
    "formInstanceId" UUID NOT NULL,
    "formFieldId" UUID NOT NULL,
    "value" JSONB,

    CONSTRAINT "form_field_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_signatures" (
    "id" UUID NOT NULL,
    "formInstanceId" UUID NOT NULL,
    "formSignatureStageId" UUID NOT NULL,
    "signerId" TEXT,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "comments" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_audit_logs" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanction_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanction_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinary_cases" (
    "id" UUID NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "dateReported" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "incidentLocation" TEXT,
    "category" "DisciplinaryCaseCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supportingDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "witnesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "investigationRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "DisciplinaryCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disciplinary_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinary_meetings" (
    "id" UUID NOT NULL,
    "disciplinaryCaseId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disciplinary_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigations" (
    "id" UUID NOT NULL,
    "disciplinaryCaseId" UUID NOT NULL,
    "investigatorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "status" "InvestigationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "summary" TEXT,
    "findings" TEXT,
    "supportingDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanctions" (
    "id" UUID NOT NULL,
    "disciplinaryCaseId" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sanctionTypeId" UUID NOT NULL,
    "dateOfSanction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "issuedById" TEXT NOT NULL,
    "approvalAuthorityId" TEXT,
    "comments" TEXT,
    "supportingDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grievances" (
    "id" UUID NOT NULL,
    "grievanceNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dateSubmitted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "GrievanceCategory" NOT NULL,
    "supportingDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GrievanceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "assignedToId" TEXT,
    "resolutionComments" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grievances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" UUID NOT NULL,
    "disciplinaryCaseId" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "appealDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appealReason" TEXT NOT NULL,
    "supportingDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "AppealStatus" NOT NULL DEFAULT 'SUBMITTED',
    "outcome" "AppealOutcome",
    "decisionDate" TIMESTAMP(3),
    "decisionComments" TEXT,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_relations_audit_logs" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_relations_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_categories_name_key" ON "form_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "form_templates_formCode_key" ON "form_templates"("formCode");

-- CreateIndex
CREATE INDEX "form_templates_categoryId_idx" ON "form_templates"("categoryId");

-- CreateIndex
CREATE INDEX "form_templates_status_idx" ON "form_templates"("status");

-- CreateIndex
CREATE INDEX "form_templates_rootTemplateId_idx" ON "form_templates"("rootTemplateId");

-- CreateIndex
CREATE INDEX "form_fields_formTemplateId_idx" ON "form_fields"("formTemplateId");

-- CreateIndex
CREATE INDEX "form_signature_stages_formTemplateId_stageOrder_idx" ON "form_signature_stages"("formTemplateId", "stageOrder");

-- CreateIndex
CREATE INDEX "form_instances_employeeId_status_idx" ON "form_instances"("employeeId", "status");

-- CreateIndex
CREATE INDEX "form_instances_status_dueDate_idx" ON "form_instances"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "form_field_responses_formInstanceId_formFieldId_key" ON "form_field_responses"("formInstanceId", "formFieldId");

-- CreateIndex
CREATE INDEX "form_signatures_signerId_status_idx" ON "form_signatures"("signerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "form_signatures_formInstanceId_formSignatureStageId_key" ON "form_signatures"("formInstanceId", "formSignatureStageId");

-- CreateIndex
CREATE INDEX "form_audit_logs_entityType_entityId_createdAt_idx" ON "form_audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sanction_types_name_key" ON "sanction_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "disciplinary_cases_caseNumber_key" ON "disciplinary_cases"("caseNumber");

-- CreateIndex
CREATE INDEX "disciplinary_cases_employeeId_status_idx" ON "disciplinary_cases"("employeeId", "status");

-- CreateIndex
CREATE INDEX "disciplinary_cases_status_idx" ON "disciplinary_cases"("status");

-- CreateIndex
CREATE INDEX "disciplinary_meetings_disciplinaryCaseId_idx" ON "disciplinary_meetings"("disciplinaryCaseId");

-- CreateIndex
CREATE INDEX "investigations_disciplinaryCaseId_idx" ON "investigations"("disciplinaryCaseId");

-- CreateIndex
CREATE INDEX "sanctions_employeeId_idx" ON "sanctions"("employeeId");

-- CreateIndex
CREATE INDEX "sanctions_disciplinaryCaseId_idx" ON "sanctions"("disciplinaryCaseId");

-- CreateIndex
CREATE INDEX "sanctions_sanctionTypeId_idx" ON "sanctions"("sanctionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "grievances_grievanceNumber_key" ON "grievances"("grievanceNumber");

-- CreateIndex
CREATE INDEX "grievances_employeeId_idx" ON "grievances"("employeeId");

-- CreateIndex
CREATE INDEX "grievances_status_idx" ON "grievances"("status");

-- CreateIndex
CREATE INDEX "appeals_disciplinaryCaseId_idx" ON "appeals"("disciplinaryCaseId");

-- CreateIndex
CREATE INDEX "appeals_employeeId_idx" ON "appeals"("employeeId");

-- CreateIndex
CREATE INDEX "employee_relations_audit_logs_entityType_entityId_createdAt_idx" ON "employee_relations_audit_logs"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "form_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_applicableDepartmentId_fkey" FOREIGN KEY ("applicableDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_rootTemplateId_fkey" FOREIGN KEY ("rootTemplateId") REFERENCES "form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signature_stages" ADD CONSTRAINT "form_signature_stages_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signature_stages" ADD CONSTRAINT "form_signature_stages_specificApproverId_fkey" FOREIGN KEY ("specificApproverId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_field_responses" ADD CONSTRAINT "form_field_responses_formInstanceId_fkey" FOREIGN KEY ("formInstanceId") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_field_responses" ADD CONSTRAINT "form_field_responses_formFieldId_fkey" FOREIGN KEY ("formFieldId") REFERENCES "form_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signatures" ADD CONSTRAINT "form_signatures_formInstanceId_fkey" FOREIGN KEY ("formInstanceId") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signatures" ADD CONSTRAINT "form_signatures_formSignatureStageId_fkey" FOREIGN KEY ("formSignatureStageId") REFERENCES "form_signature_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_signatures" ADD CONSTRAINT "form_signatures_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_audit_logs" ADD CONSTRAINT "form_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_cases" ADD CONSTRAINT "disciplinary_cases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_cases" ADD CONSTRAINT "disciplinary_cases_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_meetings" ADD CONSTRAINT "disciplinary_meetings_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_meetings" ADD CONSTRAINT "disciplinary_meetings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_investigatorId_fkey" FOREIGN KEY ("investigatorId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_sanctionTypeId_fkey" FOREIGN KEY ("sanctionTypeId") REFERENCES "sanction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_approvalAuthorityId_fkey" FOREIGN KEY ("approvalAuthorityId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "disciplinary_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_relations_audit_logs" ADD CONSTRAINT "employee_relations_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;
