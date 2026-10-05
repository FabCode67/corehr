-- Tracks when each employee's EDWH row last changed (drives YEAR_MONTH).
ALTER TABLE "employees" ADD COLUMN "edwhRowHash" TEXT;
ALTER TABLE "employees" ADD COLUMN "edwhYearMonth" TEXT;
