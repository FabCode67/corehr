-- CreateEnum
CREATE TYPE "PerformanceReviewType" AS ENUM ('MID_YEAR', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PerformanceCycleStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PerformanceReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'FINALIZED');

-- CreateTable
CREATE TABLE "performance_rating_scales" (
    "id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_rating_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_review_periods" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "midYearStatus" "PerformanceCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "midYearOpensAt" TIMESTAMP(3),
    "midYearClosesAt" TIMESTAMP(3),
    "annualStatus" "PerformanceCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "annualOpensAt" TIMESTAMP(3),
    "annualClosesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_review_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "reviewType" "PerformanceReviewType" NOT NULL,
    "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerId" UUID,
    "departmentId" UUID,
    "unitId" UUID,
    "positionId" UUID,
    "levelId" UUID,
    "bandId" UUID,
    "branchId" UUID,
    "contractType" "ContractType",
    "gender" "Gender",
    "overallRating" INTEGER,
    "strengths" TEXT,
    "achievements" TEXT,
    "areasForImprovement" TEXT,
    "goalsAchieved" TEXT,
    "goalsNotAchieved" TEXT,
    "behaviourCompetencies" TEXT,
    "recommendedTraining" TEXT,
    "developmentPlan" TEXT,
    "managerComments" TEXT,
    "employeeComments" TEXT,
    "hrComments" TEXT,
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_audit_logs" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "performance_rating_scales_rank_key" ON "performance_rating_scales"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "performance_rating_scales_label_key" ON "performance_rating_scales"("label");

-- CreateIndex
CREATE UNIQUE INDEX "performance_review_periods_name_key" ON "performance_review_periods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "performance_review_periods_year_key" ON "performance_review_periods"("year");

-- CreateIndex
CREATE INDEX "performance_reviews_employeeId_idx" ON "performance_reviews"("employeeId");

-- CreateIndex
CREATE INDEX "performance_reviews_departmentId_idx" ON "performance_reviews"("departmentId");

-- CreateIndex
CREATE INDEX "performance_reviews_branchId_idx" ON "performance_reviews"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_periodId_employeeId_reviewType_key" ON "performance_reviews"("periodId", "employeeId", "reviewType");

-- CreateIndex
CREATE INDEX "performance_audit_logs_reviewId_createdAt_idx" ON "performance_audit_logs"("reviewId", "createdAt");

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "performance_review_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "position_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_audit_logs" ADD CONSTRAINT "performance_audit_logs_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "performance_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_audit_logs" ADD CONSTRAINT "performance_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
