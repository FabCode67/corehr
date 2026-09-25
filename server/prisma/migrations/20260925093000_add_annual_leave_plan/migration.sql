-- Annual Leave Plan — a Head of Department uploads a spreadsheet forecasting
-- when each of their employees intends to take annual leave for the year.
-- See schema.prisma's AnnualLeavePlanEntry doc comment for the full design.

-- CreateTable
CREATE TABLE "annual_leave_plan_entries" (
    "id" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "departmentId" UUID NOT NULL,
    "carryForwardBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualEntitlement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEntitled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveTaken" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "january" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "february" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "march" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "april" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "may" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "june" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "july" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "august" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "september" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "october" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "november" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "december" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_leave_plan_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "annual_leave_plan_entries_employeeId_year_key" ON "annual_leave_plan_entries"("employeeId", "year");

-- CreateIndex
CREATE INDEX "annual_leave_plan_entries_departmentId_year_idx" ON "annual_leave_plan_entries"("departmentId", "year");

-- AddForeignKey
ALTER TABLE "annual_leave_plan_entries" ADD CONSTRAINT "annual_leave_plan_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_leave_plan_entries" ADD CONSTRAINT "annual_leave_plan_entries_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_leave_plan_entries" ADD CONSTRAINT "annual_leave_plan_entries_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
