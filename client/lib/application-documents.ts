/** Document types a candidate can upload on the public apply form —
 *  mirror of server recruitment/public-jobs/application-documents.ts. */
export const APPLICATION_DOCUMENT_TYPES = [
  "CV",
  "COVER_LETTER",
  "ID_DOCUMENT",
  "ACADEMIC_CERTIFICATES",
  "PROFESSIONAL_CERTIFICATES",
  "REFERENCE_LETTERS",
  "OTHER",
] as const

export type ApplicationDocumentType = (typeof APPLICATION_DOCUMENT_TYPES)[number]

export const APPLICATION_DOCUMENT_LABELS: Record<string, string> = {
  CV: "CV / Résumé",
  COVER_LETTER: "Cover letter",
  ID_DOCUMENT: "National ID / Passport",
  ACADEMIC_CERTIFICATES: "Academic certificates",
  PROFESSIONAL_CERTIFICATES: "Professional certificates",
  REFERENCE_LETTERS: "Reference letters",
  OTHER: "Other supporting document",
}
