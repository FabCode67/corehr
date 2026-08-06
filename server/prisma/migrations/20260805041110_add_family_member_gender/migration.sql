-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "parentDepartmentId" UUID;

-- AlterTable
ALTER TABLE "employee_family_members" ADD COLUMN     "gender" "Gender";

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
