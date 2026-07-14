-- CreateEnum
CREATE TYPE "LeaveCategory" AS ENUM ('ANNUAL', 'MATERNITY', 'PATERNITY', 'SICK', 'COMPASSIONATE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveEntitlementCategory" AS ENUM ('PERMANENT', 'TEMPORARY', 'GRADUATE_TRAINEE', 'INTERN', 'MANAGING_DIRECTOR');

-- CreateEnum
CREATE TYPE "ApprovalRole" AS ENUM ('LINE_MANAGER', 'HR');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'LEAVE_STARTING_SOON', 'RETURNING_TOMORROW', 'LOW_BALANCE', 'APPROVAL_NEEDED');

-- CreateTable
CREATE TABLE "leave_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" "LeaveCategory" NOT NULL DEFAULT 'OTHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "affectsAnnualBalance" BOOLEAN NOT NULL DEFAULT true,
    "genderRestriction" "Gender",
    "maxDaysPerYear" INTEGER,
    "requiresDocumentation" BOOLEAN NOT NULL DEFAULT false,
    "documentationThresholdDays" INTEGER,
    "requiresHrApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_entitlement_rules" (
    "id" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "employeeCategory" "LeaveEntitlementCategory" NOT NULL,
    "days" INTEGER NOT NULL,

    CONSTRAINT "leave_entitlement_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approval_steps" (
    "id" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "ApprovalRole" NOT NULL,

    CONSTRAINT "leave_approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_carry_forward_rules" (
    "id" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "maxDays" INTEGER,
    "expiresAfterDays" INTEGER,

    CONSTRAINT "leave_carry_forward_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isRecurringAnnually" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "weekendDays" INTEGER[] DEFAULT ARRAY[0, 6]::INTEGER[],
    "excludeWeekends" BOOLEAN NOT NULL DEFAULT true,
    "excludePublicHolidays" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "entitledDays" INTEGER NOT NULL DEFAULT 0,
    "carriedForwardDays" INTEGER NOT NULL DEFAULT 0,
    "adjustmentDays" INTEGER NOT NULL DEFAULT 0,
    "takenDays" INTEGER NOT NULL DEFAULT 0,
    "pendingDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "returnDate" DATE NOT NULL,
    "numberOfDays" INTEGER NOT NULL,
    "reason" TEXT,
    "attachmentUrl" TEXT,
    "delegateEmployeeId" UUID,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "currentStepOrder" INTEGER,
    "hrOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approvals" (
    "id" UUID NOT NULL,
    "leaveRequestId" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "ApprovalRole" NOT NULL,
    "decision" "ApprovalDecision",
    "approverEmployeeId" UUID,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipientEmployeeId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedLeaveRequestId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_name_key" ON "leave_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_code_key" ON "leave_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_entitlement_rules_leaveTypeId_employeeCategory_key" ON "leave_entitlement_rules"("leaveTypeId", "employeeCategory");

-- CreateIndex
CREATE UNIQUE INDEX "leave_approval_steps_leaveTypeId_order_key" ON "leave_approval_steps"("leaveTypeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "leave_carry_forward_rules_leaveTypeId_key" ON "leave_carry_forward_rules"("leaveTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "public_holidays_date_key" ON "public_holidays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employeeId_leaveTypeId_year_key" ON "leave_balances"("employeeId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "leave_requests_employeeId_status_idx" ON "leave_requests"("employeeId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_startDate_endDate_idx" ON "leave_requests"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "leave_approvals_leaveRequestId_order_key" ON "leave_approvals"("leaveRequestId", "order");

-- CreateIndex
CREATE INDEX "notifications_recipientEmployeeId_isRead_idx" ON "notifications"("recipientEmployeeId", "isRead");

-- AddForeignKey
ALTER TABLE "leave_entitlement_rules" ADD CONSTRAINT "leave_entitlement_rules_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_steps" ADD CONSTRAINT "leave_approval_steps_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_carry_forward_rules" ADD CONSTRAINT "leave_carry_forward_rules_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_delegateEmployeeId_fkey" FOREIGN KEY ("delegateEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "leave_approval_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_approverEmployeeId_fkey" FOREIGN KEY ("approverEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientEmployeeId_fkey" FOREIGN KEY ("recipientEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_relatedLeaveRequestId_fkey" FOREIGN KEY ("relatedLeaveRequestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
