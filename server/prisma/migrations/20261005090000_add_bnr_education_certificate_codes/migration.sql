-- BNR/EDWH code pickers on the Professional Profile education/certification
-- records. Both nullable; existing rows are unaffected (the EDWH export
-- falls back to deriving the education code from EducationType).
ALTER TABLE "employee_education" ADD COLUMN "bnrEducationCode" INTEGER;
ALTER TABLE "employee_certifications" ADD COLUMN "bnrCertificateCode" TEXT;
