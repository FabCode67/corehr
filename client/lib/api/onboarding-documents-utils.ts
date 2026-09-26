/**
 * Pure, dependency-free helpers pulled out of lib/api/onboarding-documents.ts.
 *
 * onboarding-documents.ts imports apiFetchSafe from ./client, which imports
 * next/headers's cookies() — fine for its Server Component/Action fetchers,
 * but poison for any "use client" component that also wants one of the
 * plain label maps below, since Turbopack's Server/Client boundary check is
 * per-file, not per-export (see export-urls.ts and siblings for the same
 * pattern elsewhere in lib/api).
 */

import type { OnboardingDocumentCategory, OnboardingDocumentStatus } from "./onboarding-documents"

export const DOCUMENT_CATEGORY_LABELS: Record<OnboardingDocumentCategory, string> = {
  IDENTIFICATION: "Identification",
  EMPLOYMENT: "Employment",
  COMPLIANCE: "Compliance",
  FINANCIAL: "Financial",
  MEDICAL: "Medical",
  IT: "IT",
  ASSET: "Asset",
  OTHER: "Other",
}

export const DOCUMENT_STATUS_LABELS: Record<OnboardingDocumentStatus, string> = {
  NOT_STARTED: "Not Started",
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESUBMISSION_REQUIRED: "Resubmission Required",
}

export const DOCUMENT_STATUS_BADGE_VARIANT: Record<OnboardingDocumentStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  NOT_STARTED: "outline",
  UPLOADED: "default",
  UNDER_REVIEW: "default",
  APPROVED: "success",
  REJECTED: "destructive",
  RESUBMISSION_REQUIRED: "secondary",
}
