-- CreateEnum
CREATE TYPE "CourseDeliveryMethod" AS ENUM ('CLASSROOM', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "CourseAssignmentPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CourseAssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED_BY_EMPLOYEE', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COURSE_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'COURSE_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'COURSE_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATE_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'MANDATORY_TRAINING_INCOMPLETE';

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "courseCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" UUID NOT NULL,
    "institutionId" UUID,
    "cost" INTEGER,
    "durationHours" INTEGER,
    "deliveryMethod" "CourseDeliveryMethod" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "requiredFunctionId" UUID,
    "requiredDepartmentId" UUID,
    "requiredUnitId" UUID,
    "requiredPositionId" UUID,
    "requiredLevelId" UUID,
    "requiredBandId" UUID,
    "requiredContractType" "ContractType",
    "autoAssignOnHire" BOOLEAN NOT NULL DEFAULT false,
    "autoAssignDueMonths" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedById" TEXT,
    "verifiedById" TEXT,
    "categoryName" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL,
    "departmentId" UUID,
    "unitId" UUID,
    "positionId" UUID,
    "levelId" UUID,
    "bandId" UUID,
    "branchId" UUID,
    "contractType" "ContractType",
    "dueDate" TIMESTAMP(3),
    "priority" "CourseAssignmentPriority" NOT NULL DEFAULT 'MEDIUM',
    "recommendationComment" TEXT,
    "reasonForAssignment" TEXT,
    "status" "CourseAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "certificateUploadedAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "employeeCertificateComment" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "hrVerificationComment" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_audit_logs" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_name_key" ON "institutions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "training_categories_name_key" ON "training_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "courses_courseCode_key" ON "courses"("courseCode");

-- CreateIndex
CREATE INDEX "courses_categoryId_idx" ON "courses"("categoryId");

-- CreateIndex
CREATE INDEX "courses_institutionId_idx" ON "courses"("institutionId");

-- CreateIndex
CREATE INDEX "course_assignments_employeeId_status_idx" ON "course_assignments"("employeeId", "status");

-- CreateIndex
CREATE INDEX "course_assignments_status_dueDate_idx" ON "course_assignments"("status", "dueDate");

-- CreateIndex
CREATE INDEX "course_assignments_departmentId_idx" ON "course_assignments"("departmentId");

-- CreateIndex
CREATE INDEX "course_assignments_branchId_idx" ON "course_assignments"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignments_courseId_employeeId_key" ON "course_assignments"("courseId", "employeeId");

-- CreateIndex
CREATE INDEX "course_audit_logs_assignmentId_createdAt_idx" ON "course_audit_logs"("assignmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "training_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_requiredFunctionId_fkey" FOREIGN KEY ("requiredFunctionId") REFERENCES "functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_requiredDepartmentId_fkey" FOREIGN KEY ("requiredDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_requiredUnitId_fkey" FOREIGN KEY ("requiredUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_requiredPositionId_fkey" FOREIGN KEY ("requiredPositionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_requiredLevelId_fkey" FOREIGN KEY ("requiredLevelId") REFERENCES "position_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_requiredBandId_fkey" FOREIGN KEY ("requiredBandId") REFERENCES "bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "position_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_audit_logs" ADD CONSTRAINT "course_audit_logs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "course_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_audit_logs" ADD CONSTRAINT "course_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;
