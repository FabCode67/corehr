-- Employee is the most heavily joined/filtered table in the schema but
-- historically carried no indexes beyond its two @unique columns (email,
-- nationalIdNumber). This adds indexes for the columns every list/dropdown/
-- report endpoint actually filters on: org-structure lookups and the two
-- status flags almost every query filters on.

-- CreateIndex
CREATE INDEX "employees_positionId_idx" ON "employees"("positionId");

-- CreateIndex
CREATE INDEX "employees_bandId_idx" ON "employees"("bandId");

-- CreateIndex
CREATE INDEX "employees_branchId_idx" ON "employees"("branchId");

-- CreateIndex
CREATE INDEX "employees_employmentStatus_idx" ON "employees"("employmentStatus");

-- CreateIndex
CREATE INDEX "employees_isActive_idx" ON "employees"("isActive");
