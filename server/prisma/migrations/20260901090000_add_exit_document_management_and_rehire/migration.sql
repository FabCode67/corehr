-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EMPLOYEE_REHIRED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "rehiredAt" TIMESTAMP(3),
ADD COLUMN     "rehiredById" TEXT;

-- CreateTable
CREATE TABLE "exit_document_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exit_document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exit_document_assignments" (
    "id" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentTypeId" UUID NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exit_document_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exit_document_types_name_key" ON "exit_document_types"("name");

-- CreateIndex
CREATE INDEX "exit_document_assignments_employeeId_isCompleted_idx" ON "exit_document_assignments"("employeeId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "exit_document_assignments_employeeId_documentTypeId_key" ON "exit_document_assignments"("employeeId", "documentTypeId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_rehiredById_fkey" FOREIGN KEY ("rehiredById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_document_assignments" ADD CONSTRAINT "exit_document_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_document_assignments" ADD CONSTRAINT "exit_document_assignments_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "exit_document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_document_assignments" ADD CONSTRAINT "exit_document_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_document_assignments" ADD CONSTRAINT "exit_document_assignments_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;
