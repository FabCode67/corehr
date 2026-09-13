-- Exit Clearance Workflow — supersedes the old Exit Document Management
-- checklist (exit_document_types / exit_document_assignments) with a
-- configurable departmental clearance workflow. See schema.prisma's
-- "EXIT CLEARANCE WORKFLOW" module doc comment for the full design.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EXIT_CLEARANCE_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'EXIT_CLEARANCE_REVIEW_NEEDED';
ALTER TYPE "NotificationType" ADD VALUE 'EXIT_CLEARANCE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'EXIT_CLEARANCE_RETURNED';
ALTER TYPE "NotificationType" ADD VALUE 'EXIT_CLEARANCE_OVERDUE';

-- CreateEnum
CREATE TYPE "ExitClearanceStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExitClearanceAuditAction" AS ENUM ('ASSIGNED', 'EMPLOYEE_COMPLETED', 'APPROVED', 'RETURNED', 'REMINDER_SENT');

-- DropForeignKey (old Exit Document Management tables being replaced)
ALTER TABLE "exit_document_assignments" DROP CONSTRAINT "exit_document_assignments_employeeId_fkey";
ALTER TABLE "exit_document_assignments" DROP CONSTRAINT "exit_document_assignments_documentTypeId_fkey";
ALTER TABLE "exit_document_assignments" DROP CONSTRAINT "exit_document_assignments_assignedById_fkey";
ALTER TABLE "exit_document_assignments" DROP CONSTRAINT "exit_document_assignments_completedById_fkey";

-- DropTable
DROP TABLE "exit_document_assignments";

-- DropTable
DROP TABLE "exit_document_types";

-- CreateTable
CREATE TABLE "exit_clearance_form_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "responsibleDepartmentId" UUID NOT NULL,
    "responsiblePositionId" UUID NOT NULL,
    "requiresEmployeeCompletion" BOOLEAN NOT NULL DEFAULT true,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "daysToComplete" INTEGER NOT NULL DEFAULT 7,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exit_clearance_form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exit_clearance_form_assignments" (
    "id" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "templateId" UUID NOT NULL,
    "status" "ExitClearanceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "employeeCompletedAt" TIMESTAMP(3),
    "employeeCompletedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedById" TEXT,
    "lastActionComment" TEXT,
    "lastReminderSentAt" TIMESTAMP(3),
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exit_clearance_form_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exit_clearance_audit_logs" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "action" "ExitClearanceAuditAction" NOT NULL,
    "actorId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exit_clearance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exit_clearance_form_templates_name_key" ON "exit_clearance_form_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "exit_clearance_form_assignments_employeeId_templateId_key" ON "exit_clearance_form_assignments"("employeeId", "templateId");

-- CreateIndex
CREATE INDEX "exit_clearance_form_assignments_employeeId_status_idx" ON "exit_clearance_form_assignments"("employeeId", "status");

-- CreateIndex
CREATE INDEX "exit_clearance_form_assignments_status_dueDate_idx" ON "exit_clearance_form_assignments"("status", "dueDate");

-- CreateIndex
CREATE INDEX "exit_clearance_audit_logs_assignmentId_createdAt_idx" ON "exit_clearance_audit_logs"("assignmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "exit_clearance_form_templates" ADD CONSTRAINT "exit_clearance_form_templates_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_form_templates" ADD CONSTRAINT "exit_clearance_form_templates_responsiblePositionId_fkey" FOREIGN KEY ("responsiblePositionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_form_assignments" ADD CONSTRAINT "exit_clearance_form_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_form_assignments" ADD CONSTRAINT "exit_clearance_form_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "exit_clearance_form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_form_assignments" ADD CONSTRAINT "exit_clearance_form_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_form_assignments" ADD CONSTRAINT "exit_clearance_form_assignments_employeeCompletedById_fkey" FOREIGN KEY ("employeeCompletedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_form_assignments" ADD CONSTRAINT "exit_clearance_form_assignments_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_form_assignments" ADD CONSTRAINT "exit_clearance_form_assignments_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_audit_logs" ADD CONSTRAINT "exit_clearance_audit_logs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "exit_clearance_form_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_clearance_audit_logs" ADD CONSTRAINT "exit_clearance_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;
