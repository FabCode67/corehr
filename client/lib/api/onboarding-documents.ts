import { apiFetchSafe } from "./client"

// ---- Enums ------------------------------------------------------------------

export type OnboardingDocumentCategory = "IDENTIFICATION" | "EMPLOYMENT" | "COMPLIANCE" | "FINANCIAL" | "MEDICAL" | "IT" | "ASSET" | "OTHER"

/** UPLOADED exists in the Prisma enum but AssignmentsService.upload() jumps
 *  straight from NOT_STARTED to UNDER_REVIEW — kept here only so this
 *  Record type stays exhaustive against the backend enum. */
export type OnboardingDocumentStatus = "NOT_STARTED" | "UPLOADED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "RESUBMISSION_REQUIRED"

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

function toQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

// ---- Document types (HR-configurable requirements) ---------------------------

export interface OnboardingDocumentType {
  id: string
  name: string
  description: string | null
  category: OnboardingDocumentCategory
  isMandatory: boolean
  applicableContractTypes: string[]
  applicableFunctionIds: string[]
  applicableDepartmentIds: string[]
  applicablePositionIds: string[]
  applicableBandIds: string[]
  effectiveDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function fetchDocumentTypes(includeInactive = false) {
  return apiFetchSafe<OnboardingDocumentType[]>(`/onboarding-documents/document-types${toQuery({ includeInactive })}`)
}

export function fetchDocumentType(id: string) {
  return apiFetchSafe<OnboardingDocumentType>(`/onboarding-documents/document-types/${id}`)
}

export interface ApplicableDocumentsProfile {
  contractType?: string | null
  functionId?: string | null
  departmentId?: string | null
  positionId?: string | null
  bandId?: string | null
}

export function fetchApplicableDocumentTypes(profile: ApplicableDocumentsProfile) {
  return apiFetchSafe<OnboardingDocumentType[]>(`/onboarding-documents/document-types/applicable${toQuery({ ...profile })}`)
}

// ---- Assignments (per-employee tracking) --------------------------------------

interface EmployeeRef {
  employeeNumber: string
  firstName: string
  lastName: string
}

export interface OnboardingDocumentAssignment {
  id: string
  employeeId: string
  documentTypeId: string
  status: OnboardingDocumentStatus
  fileUrl: string | null
  uploadedAt: string | null
  reviewedAt: string | null
  reviewComments: string | null
  assignedById: string
  reviewedById: string | null
  documentType: OnboardingDocumentType
  employee: EmployeeRef
  assignedBy: EmployeeRef
  reviewedBy: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export function fetchAssignmentsForEmployee(employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<OnboardingDocumentAssignment[]>(`/onboarding-documents/assignments/employee/${employeeId}${toQuery({ actingEmployeeId })}`)
}

export interface OnboardingProgress {
  total: number
  approved: number
  remaining: number
  percentageCompleted: number
  missing: { id: string; documentTypeName: string; status: OnboardingDocumentStatus; isMandatory: boolean }[]
}

export function fetchOnboardingProgress(employeeId: string) {
  return apiFetchSafe<OnboardingProgress>(`/onboarding-documents/assignments/employee/${employeeId}/progress`)
}

export interface OnboardingHrOverviewEntry {
  employeeId: string
  employeeName: string
  departmentName: string
  total: number
  approved: number
  remaining: number
  percentageCompleted: number
}

export function fetchOnboardingHrOverview(actingEmployeeId: string) {
  return apiFetchSafe<OnboardingHrOverviewEntry[]>(`/onboarding-documents/assignments/overview${toQuery({ actingEmployeeId })}`)
}
