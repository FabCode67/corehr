ALTER TABLE "job_descriptions" ADD COLUMN "content" JSONB;
ALTER TABLE "job_descriptions" ADD COLUMN "positionId" UUID;
ALTER TABLE "job_descriptions" ADD COLUMN "createdById" TEXT;
CREATE INDEX "job_descriptions_positionId_idx" ON "job_descriptions"("positionId");
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
