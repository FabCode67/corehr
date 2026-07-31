import { apiFetchSafe } from "./client"

// ---- Enums ------------------------------------------------------------------

export type FormStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"
export type FieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "COMMENTS"
  | "NUMBER"
  | "AMOUNT"
  | "PERCENTAGE"
  | "DATE"
  | "DATE_RANGE"
  | "DROPDOWN"
  | "RADIO"
  | "CHECKBOX"
  | "MULTI_SELECT"
  | "EMPLOYEE_SELECT"
  | "DEPARTMENT_SELECT"
  | "POSITION_SELECT"
  | "MANAGER_SELECT"
  | "FILE_UPLOAD"
  | "CERTIFICATE_UPLOAD"
  | "ATTACHMENT_UPLOAD"
  | "APPROVAL_DECISION"
  | "RECOMMENDATION"
  | "TABLE"
export type SignerRole = "EMPLOYEE" | "MANAGER" | "HEAD_OF_DEPARTMENT" | "HR" | "EXECUTIVE_MANAGEMENT" | "SPECIFIC_APPROVER"
export type SignatureStatus = "PENDING" | "SIGNED" | "REJECTED" | "RETURNED_FOR_CORRECTION"
export type FormInstanceStatus =
  | "DRAFT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "PENDING_SIGNATURES"
  | "REJECTED"
  | "COMPLETED"
  | "ARCHIVED"
export type FormPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

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

function toQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

interface EmployeeRef {
  employeeNumber: string
  firstName: string
  lastName: string
}

// ---- Categories ---------------------------------------------------------------

export interface FormCategory {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function fetchFormCategories(includeInactive = false) {
  return apiFetchSafe<FormCategory[]>(`/forms/categories${toQuery({ includeInactive })}`)
}

export function fetchFormCategory(id: string) {
  return apiFetchSafe<FormCategory>(`/forms/categories/${id}`)
}

// ---- Templates ------------------------------------------------------------------

export interface FieldOption {
  value: string
  label: string
}

export interface TableColumn {
  key: string
  label: string
  type: string
}

export interface FormField {
  id: string
  formTemplateId: string
  fieldType: FieldType
  label: string
  helpText: string | null
  isRequired: boolean
  order: number
  options: FieldOption[] | null
  tableColumns: TableColumn[] | null
}

export interface FormSignatureStage {
  id: string
  formTemplateId: string
  stageOrder: number
  role: SignerRole
  specificApproverId: string | null
  label: string | null
  specificApprover?: EmployeeRef | null
}

export interface FormTemplate {
  id: string
  title: string
  formCode: string
  description: string
  purpose: string | null
  categoryId: string
  requirementsInstructions: string | null
  applicableDepartmentId: string | null
  applicableEmployeeCategory: string | null
  status: FormStatus
  version: number
  rootTemplateId: string | null
  createdById: string
  category: { id: string; name: string }
  applicableDepartment: { id: string; name: string } | null
  createdBy: EmployeeRef
  fields: FormField[]
  signatureStages: FormSignatureStage[]
  createdAt: string
  updatedAt: string
}

export interface FormTemplateFilters {
  categoryId?: string
  status?: FormStatus
}

export function fetchFormTemplates(filters: FormTemplateFilters = {}) {
  return apiFetchSafe<FormTemplate[]>(`/forms/templates${toQuery({ ...filters })}`)
}

export function fetchFormTemplate(id: string) {
  return apiFetchSafe<FormTemplate>(`/forms/templates/${id}`)
}

// ---- Instances -------------------------------------------------------------------

export interface FormFieldResponse {
  id: string
  formInstanceId: string
  formFieldId: string
  value: unknown
}

export interface FormSignature {
  id: string
  formInstanceId: string
  formSignatureStageId: string
  signerId: string | null
  status: SignatureStatus
  signedAt: string | null
  comments: string | null
  ipAddress: string | null
  formSignatureStage: FormSignatureStage
  signer: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export interface FormInstance {
  id: string
  formTemplateId: string
  formVersion: number
  employeeId: string
  assignedById: string
  assignmentDate: string
  dueDate: string | null
  instructions: string | null
  priority: FormPriority
  status: FormInstanceStatus
  submittedAt: string | null
  completedAt: string | null
  rejectedAt: string | null
  rejectionComment: string | null
  formTemplate: FormTemplate
  employee: EmployeeRef
  assignedBy: EmployeeRef
  responses: FormFieldResponse[]
  signatures: FormSignature[]
  createdAt: string
  updatedAt: string
}

export interface FormInstanceFilters {
  employeeId?: string
  status?: FormInstanceStatus
}

export function fetchFormInstances(filters: FormInstanceFilters, actingEmployeeId: string) {
  return apiFetchSafe<FormInstance[]>(`/forms/instances${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchPendingSignatures(actingEmployeeId: string) {
  return apiFetchSafe<FormInstance[]>(`/forms/instances/pending-signatures${toQuery({ actingEmployeeId })}`)
}

export function fetchFormInstance(id: string, actingEmployeeId: string) {
  return apiFetchSafe<FormInstance>(`/forms/instances/${id}${toQuery({ actingEmployeeId })}`)
}

export interface FormAuditLogEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  actorId: string | null
  notes: string | null
  actor: EmployeeRef | null
  createdAt: string
}

export function fetchFormInstanceAuditLog(id: string, actingEmployeeId: string) {
  return apiFetchSafe<FormAuditLogEntry[]>(`/forms/instances/${id}/audit-log${toQuery({ actingEmployeeId })}`)
}

// ---- Analytics ----------------------------------------------------------------------

export interface FormsOverview {
  assigned: number
  inProgress: number
  pendingSignatures: number
  completed: number
  overdue: number
  rejected: number
}

export function fetchFormsOverview(actingEmployeeId: string) {
  return apiFetchSafe<FormsOverview>(`/forms/analytics/overview${toQuery({ actingEmployeeId })}`)
}

export function fetchFormsStatusDistribution(actingEmployeeId: string) {
  return apiFetchSafe<{ status: FormInstanceStatus; count: number }[]>(
    `/forms/analytics/status-distribution${toQuery({ actingEmployeeId })}`
  )
}

export function fetchFormsCompletionStats(actingEmployeeId: string) {
  return apiFetchSafe<{ totalInstances: number; completedCount: number; completionRate: number | null; averageCompletionDays: number | null }>(
    `/forms/analytics/completion-stats${toQuery({ actingEmployeeId })}`
  )
}

export function fetchPendingSignaturesByRole(actingEmployeeId: string) {
  return apiFetchSafe<{ role: SignerRole; count: number }[]>(
    `/forms/analytics/pending-signatures-by-role${toQuery({ actingEmployeeId })}`
  )
}

export function fetchFormsDepartmentComparison(actingEmployeeId: string) {
  return apiFetchSafe<{ departmentId: string; departmentName: string; total: number; completed: number; overdue: number }[]>(
    `/forms/analytics/department-comparison${toQuery({ actingEmployeeId })}`
  )
}

export function fetchFormsComplianceByCategory(actingEmployeeId: string) {
  return apiFetchSafe<{ categoryId: string; categoryName: string; total: number; completed: number; overdue: number; complianceRate: number | null }[]>(
    `/forms/analytics/compliance-by-category${toQuery({ actingEmployeeId })}`
  )
}

// ---- PDF export -------------------------------------------------------------------

/** Points at this Next.js app's own proxy route (see
 *  app/api/forms/instances/[id]/pdf/route.ts) rather than the NestJS API
 *  directly — the API's base URL is a server-only env var (see
 *  lib/org-chart.ts's note on API_URL vs NEXT_PUBLIC_API_URL), so a
 *  browser-clickable download link has to go through this app's own route
 *  instead. */
export function formInstancePdfUrl(id: string, actingEmployeeId: string) {
  return `/api/forms/instances/${id}/pdf${toQuery({ actingEmployeeId })}`
}
