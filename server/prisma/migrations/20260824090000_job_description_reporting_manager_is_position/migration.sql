-- Job descriptions are reusable templates that outlive whoever currently
-- holds a role, so "reporting manager" should name the position (e.g.
-- "Branch Manager"), not a specific employee — matches the pattern already
-- used by job_requisitions.reportsToPositionId. Existing rows lose their
-- previously-selected employee (no meaningful automatic mapping from an
-- employee to "the position they hold" exists at the schema level); HR can
-- re-set the reporting position on any template that needs it.
ALTER TABLE "job_descriptions" DROP CONSTRAINT "job_descriptions_reportingManagerId_fkey";
ALTER TABLE "job_descriptions" RENAME COLUMN "reportingManagerId" TO "reportingManagerPositionId";
ALTER TABLE "job_descriptions" ALTER COLUMN "reportingManagerPositionId" TYPE UUID USING NULL;
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_reportingManagerPositionId_fkey" FOREIGN KEY ("reportingManagerPositionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
