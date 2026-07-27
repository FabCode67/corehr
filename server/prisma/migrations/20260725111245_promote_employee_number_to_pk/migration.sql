/*
  Warnings:

  - The primary key for the `employees` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `employees` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "employee_children" DROP CONSTRAINT "employee_children_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_education" DROP CONSTRAINT "employee_education_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_reportingManagerOverrideId_fkey";

-- DropForeignKey
ALTER TABLE "leave_approvals" DROP CONSTRAINT "leave_approvals_approverEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "leave_balances" DROP CONSTRAINT "leave_balances_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_delegateEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_recipientEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "performance_audit_logs" DROP CONSTRAINT "performance_audit_logs_actorId_fkey";

-- DropForeignKey
ALTER TABLE "performance_reviews" DROP CONSTRAINT "performance_reviews_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "performance_reviews" DROP CONSTRAINT "performance_reviews_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "position_history" DROP CONSTRAINT "position_history_employeeId_fkey";

-- DropIndex
DROP INDEX "employees_employeeNumber_key";

-- AlterTable
ALTER TABLE "employee_children" ALTER COLUMN "employeeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "employee_education" ALTER COLUMN "employeeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "employees" DROP CONSTRAINT "employees_pkey",
DROP COLUMN "id",
ALTER COLUMN "reportingManagerOverrideId" SET DATA TYPE TEXT,
ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("employeeNumber");

-- AlterTable
ALTER TABLE "leave_approvals" ALTER COLUMN "approverEmployeeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "leave_balances" ALTER COLUMN "employeeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "employeeId" SET DATA TYPE TEXT,
ALTER COLUMN "delegateEmployeeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "recipientEmployeeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "performance_audit_logs" ALTER COLUMN "actorId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "performance_reviews" ALTER COLUMN "employeeId" SET DATA TYPE TEXT,
ALTER COLUMN "reviewerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "position_history" ALTER COLUMN "employeeId" SET DATA TYPE TEXT,
ALTER COLUMN "createdByUserId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reportingManagerOverrideId_fkey" FOREIGN KEY ("reportingManagerOverrideId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_children" ADD CONSTRAINT "employee_children_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_history" ADD CONSTRAINT "position_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_delegateEmployeeId_fkey" FOREIGN KEY ("delegateEmployeeId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_approverEmployeeId_fkey" FOREIGN KEY ("approverEmployeeId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientEmployeeId_fkey" FOREIGN KEY ("recipientEmployeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_audit_logs" ADD CONSTRAINT "performance_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;
