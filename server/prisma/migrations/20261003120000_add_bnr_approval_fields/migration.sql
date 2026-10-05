-- Adds the two BNR/EDWH compliance fields HR fills in directly on an
-- employee's profile for senior grades (Head of Department, Assistant
-- General Manager, Deputy Director, Director). Both nullable — existing
-- rows simply default to NULL/unset, same as every other optional
-- Employee column added after initial launch.
ALTER TABLE "employees" ADD COLUMN "bnrApprovalRequired" BOOLEAN;
ALTER TABLE "employees" ADD COLUMN "bnrApprovalDate" TIMESTAMP(3);
