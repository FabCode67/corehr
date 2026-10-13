ALTER TYPE "RequisitionStatus" ADD VALUE IF NOT EXISTS 'FILLED';

CREATE TABLE "job_posting_steps" (
    "id" UUID NOT NULL,
    "postingId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    CONSTRAINT "job_posting_steps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_posting_steps_postingId_stageId_key" ON "job_posting_steps"("postingId", "stageId");
CREATE UNIQUE INDEX "job_posting_steps_postingId_sequence_key" ON "job_posting_steps"("postingId", "sequence");
ALTER TABLE "job_posting_steps" ADD CONSTRAINT "job_posting_steps_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_posting_steps" ADD CONSTRAINT "job_posting_steps_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "recruitment_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
