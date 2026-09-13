-- Acting Head of Department: a temporary stand-in for headOfDepartmentId
-- (e.g. the real head is on leave, or the position is vacant) — HR Admin
-- sets/clears this manually via the same Department form. Grants the exact
-- same Head of Department access as headOfDepartmentId everywhere that
-- field is checked (see schema.prisma's doc comment on the new column).

-- AlterTable
ALTER TABLE "departments" ADD COLUMN "actingHeadOfDepartmentId" TEXT;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_actingHeadOfDepartmentId_fkey" FOREIGN KEY ("actingHeadOfDepartmentId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;
