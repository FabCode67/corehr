ALTER TABLE "job_postings" ADD COLUMN "shareSlug" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "job_postings" ADD COLUMN "jobDescriptionId" UUID;
CREATE UNIQUE INDEX "job_postings_shareSlug_key" ON "job_postings"("shareSlug");
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "candidates" ADD COLUMN "linkedinUrl" TEXT;
ALTER TABLE "candidates" ADD COLUMN "currentEmployer" TEXT;
ALTER TABLE "candidates" ADD COLUMN "currentPosition" TEXT;

ALTER TABLE "applications" ADD COLUMN "coverNote" TEXT;

CREATE TABLE "application_documents" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "application_documents_applicationId_idx" ON "application_documents"("applicationId");
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
