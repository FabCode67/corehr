/**
 * Pure, dependency-free helpers pulled out of lib/api/forms.ts.
 *
 * forms.ts imports apiFetchSafe from ./client, which imports next/headers's
 * cookies() — fine for its Server Component/Action fetchers, but poison for
 * any "use client" component that also wants one of the plain label
 * maps/formatters below, since Turbopack's Server/Client boundary check is
 * per-file, not per-export (see export-urls.ts and siblings for the same
 * pattern elsewhere in lib/api).
 */

import type { FieldType, FormInstanceStatus, SignerRole } from "./forms"

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  SHORT_TEXT: "Short Text",
  LONG_TEXT: "Long Text",
  COMMENTS: "Comments",
  NUMBER: "Number",
  AMOUNT: "Amount",
  PERCENTAGE: "Percentage",
  DATE: "Date",
  DATE_RANGE: "Date Range",
  DROPDOWN: "Dropdown",
  RADIO: "Radio",
  CHECKBOX: "Checkbox",
  MULTI_SELECT: "Multi-Select",
  EMPLOYEE_SELECT: "Employee Selection",
  DEPARTMENT_SELECT: "Department Selection",
  POSITION_SELECT: "Position Selection",
  MANAGER_SELECT: "Manager Selection",
  FILE_UPLOAD: "Document Upload",
  CERTIFICATE_UPLOAD: "Certificate Upload",
  ATTACHMENT_UPLOAD: "Attachment Upload",
  APPROVAL_DECISION: "Approval Decision",
  RECOMMENDATION: "Recommendation",
  TABLE: "Table",
}

export const SIGNER_ROLE_LABELS: Record<SignerRole, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  HEAD_OF_DEPARTMENT: "Head of Department",
  HR: "HR",
  EXECUTIVE_MANAGEMENT: "Executive Management",
  SPECIFIC_APPROVER: "Specific Approver",
}

export const INSTANCE_STATUS_LABELS: Record<FormInstanceStatus, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  PENDING_SIGNATURES: "Pending Signatures",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
}

export function formatFormsEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}
