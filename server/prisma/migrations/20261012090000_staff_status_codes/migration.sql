-- EDWH Staff Status codes: new exit reasons + a manual Suspended/Disability override.
ALTER TYPE "ExitReason" ADD VALUE 'RETIREMENT';
ALTER TYPE "ExitReason" ADD VALUE 'DECEASED';

CREATE TYPE "ActiveStaffStatus" AS ENUM ('SUSPENDED', 'DISABILITY');

ALTER TABLE "employees" ADD COLUMN "activeStatusOverride" "ActiveStaffStatus";
