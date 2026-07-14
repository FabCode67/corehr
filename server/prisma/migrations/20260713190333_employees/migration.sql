/*
  Warnings:

  - The values [ON_LEAVE,SUSPENDED,TERMINATED,RETIRED] on the enum `EmploymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `hireDate` on the `employees` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nationalIdNumber]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dateOfBirth` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maritalStatus` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationalIdNumber` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationality` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workLocation` to the `employees` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PERMANENT', 'TEMPORARY', 'GRADUATE_TRAINEE', 'INTERN');

-- CreateEnum
CREATE TYPE "WorkLocation" AS ENUM ('HEADQUARTERS', 'KIGALI_HEIGHTS_BRANCH', 'DOWNTOWN_BRANCH', 'REMERA_BRANCH', 'NYABUGOGO_BRANCH', 'GISOZI_BRANCH', 'RUSIZI_BRANCH', 'MUSANZE_BRANCH', 'KAYONZA_BRANCH', 'RUBAVU_BRANCH');

-- CreateEnum
CREATE TYPE "EducationType" AS ENUM ('DEGREE', 'DIPLOMA', 'CERTIFICATE', 'PROFESSIONAL_CERTIFICATION', 'TRAINING', 'COURSE', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "ExitReason" AS ENUM ('RESIGNATION', 'TERMINATION', 'END_OF_CONTRACT');

-- CreateEnum
CREATE TYPE "ExitType" AS ENUM ('REGRETTABLE', 'NON_REGRETTABLE');

-- AlterEnum
BEGIN;
CREATE TYPE "EmploymentStatus_new" AS ENUM ('ACTIVE', 'EXIT');
ALTER TABLE "public"."employees" ALTER COLUMN "employmentStatus" DROP DEFAULT;
ALTER TABLE "employees" ALTER COLUMN "employmentStatus" TYPE "EmploymentStatus_new" USING ("employmentStatus"::text::"EmploymentStatus_new");
ALTER TYPE "EmploymentStatus" RENAME TO "EmploymentStatus_old";
ALTER TYPE "EmploymentStatus_new" RENAME TO "EmploymentStatus";
DROP TYPE "public"."EmploymentStatus_old";
ALTER TABLE "employees" ALTER COLUMN "employmentStatus" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_bandId_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_positionId_fkey";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "hireDate",
ADD COLUMN     "contractType" "ContractType",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "employmentStartDate" TIMESTAMP(3),
ADD COLUMN     "exitComments" TEXT,
ADD COLUMN     "exitDate" TIMESTAMP(3),
ADD COLUMN     "exitReason" "ExitReason",
ADD COLUMN     "exitType" "ExitType",
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "maritalStatus" "MaritalStatus" NOT NULL,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "nationalIdNumber" TEXT NOT NULL,
ADD COLUMN     "nationality" TEXT NOT NULL,
ADD COLUMN     "nextMove" TEXT,
ADD COLUMN     "partnerDateOfBirth" TIMESTAMP(3),
ADD COLUMN     "partnerName" TEXT,
ADD COLUMN     "partnerPhone" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "previousDepartment" TEXT,
ADD COLUMN     "previousEmployee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousEmployeeNumber" TEXT,
ADD COLUMN     "previousExitDate" TIMESTAMP(3),
ADD COLUMN     "previousPositionHeld" TEXT,
ADD COLUMN     "previousReasonForLeaving" TEXT,
ADD COLUMN     "probationEndDate" TIMESTAMP(3),
ADD COLUMN     "profilePictureUrl" TEXT,
ADD COLUMN     "workLocation" "WorkLocation" NOT NULL,
ALTER COLUMN "positionId" DROP NOT NULL,
ALTER COLUMN "bandId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "employee_children" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_education" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" "EducationType" NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "grade" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_education_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_nationalIdNumber_key" ON "employees"("nationalIdNumber");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_children" ADD CONSTRAINT "employee_children_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
