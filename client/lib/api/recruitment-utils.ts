/**
 * Pure, dependency-free helpers pulled out of lib/api/recruitment.ts.
 *
 * recruitment.ts imports apiFetchSafe from ./client, which imports
 * next/headers's cookies() — fine for its Server Component/Action fetchers,
 * but poison for any "use client" component that also wants one of the
 * plain label maps/formatters below, since Turbopack's Server/Client
 * boundary check is per-file, not per-export (see export-urls.ts,
 * employee-utils.ts, and leave-utils.ts for the same pattern elsewhere in
 * lib/api).
 */

import type { ApplicationStageStatus, ApplicationStatus, OnboardingTaskType, RecruitmentStageName, RecruitmentStageType } from "./recruitment"

export const STAGE_LABELS: Record<RecruitmentStageName, string> = {
  WORKFORCE_PLANNING: "Workforce Planning",
  JOB_REQUISITION: "Job Requisition",
  JOB_DESCRIPTION: "Job Description",
  APPROVAL: "Approval",
  JOB_POSTING: "Job Posting",
  APPLICATIONS: "Applications",
  SCREENING: "Screening",
  ASSESSMENT: "Assessment",
  INTERVIEWS: "Interviews",
  BACKGROUND_CHECK: "Background Check",
  OFFER: "Offer",
  ONBOARDING: "Onboarding",
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

export const APPLICATION_PIPELINE: ApplicationStatus[] = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
  "HIRED",
]

export const ONBOARDING_TASK_LABELS: Record<OnboardingTaskType, string> = {
  EMPLOYEE_NUMBER_CREATED: "Employee Number Created",
  SYSTEM_ACCOUNTS_CREATED: "System Accounts Created",
  ID_CARD_ISSUED: "ID Card Issued",
  LAPTOP_ASSIGNED: "Laptop Assigned",
  WORKSPACE_ASSIGNED: "Workspace Assigned",
  MANDATORY_AML_TRAINING_ASSIGNED: "Mandatory AML Training Assigned",
  HR_ORIENTATION_SCHEDULED: "HR Orientation Scheduled",
  MANAGER_ORIENTATION_SCHEDULED: "Manager Orientation Scheduled",
  DOCUMENTS_SIGNED: "Documents Signed",
}

export function formatRecruitmentEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

export const STAGE_TYPE_LABELS: Record<RecruitmentStageType, string> = {
  SCREENING: "Screening",
  REVIEW: "Review",
  TEST: "Test",
  INTERVIEW: "Interview",
  ASSESSMENT_CENTRE: "Assessment Centre",
  DECISION: "Decision",
  OFFER: "Offer",
  ADMIN: "Admin",
}

export const APPLICATION_STAGE_STATUS_LABELS: Record<ApplicationStageStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  PASSED: "Passed",
  FAILED: "Failed",
  ON_HOLD: "On Hold",
  SKIPPED: "Skipped",
}
