import { apiFetchSafe } from "./client"
import type { ContractType } from "./employees"
import type { PaginatedResult } from "./pagination"

// ---- Enums ----------------------------------------------------------------

export type CourseDeliveryMethod = "CLASSROOM" | "ONLINE" | "HYBRID"
export type CourseAssignmentPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type CourseAssignmentStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED_BY_EMPLOYEE"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "CLOSED"

export const DELIVERY_METHOD_LABELS: Record<CourseDeliveryMethod, string> = {
  CLASSROOM: "Classroom",
  ONLINE: "Online",
  HYBRID: "Hybrid",
}

export const PRIORITY_LABELS: Record<CourseAssignmentPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
}

export const ASSIGNMENT_STATUS_LABELS: Record<CourseAssignmentStatus, string> = {
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  COMPLETED_BY_EMPLOYEE: "Completed (awaiting certificate)",
  PENDING_VERIFICATION: "Pending HR Verification",
  VERIFIED: "Verified",
  REJECTED: "Certificate Rejected",
  CLOSED: "Closed",
}

/** Assignment statuses that count as "done" for completion-rate math —
 *  mirrors the server's TERMINAL_STATUSES in assignments.service.ts /
 *  analytics.service.ts. */
export const TERMINAL_ASSIGNMENT_STATUSES: CourseAssignmentStatus[] = ["VERIFIED", "CLOSED"]

function toQuery(params: Record<string, string | number | boolean | undefined>): string
function toQuery<T extends object>(params: T): string
function toQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

// ---- Institutions -----------------------------------------------------------

export interface Institution {
  id: string
  name: string
  contactEmail: string | null
  contactPhone: string | null
  website: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function fetchInstitutions(includeInactive = false) {
  return apiFetchSafe<Institution[]>(`/learning/institutions${toQuery({ includeInactive })}`)
}

export function fetchInstitutionsPaginated(includeInactive = false, page = 1, pageSize?: number) {
  return apiFetchSafe<PaginatedResult<Institution>>(
    `/learning/institutions${toQuery({ includeInactive, page, pageSize })}`
  )
}

export function fetchInstitution(id: string) {
  return apiFetchSafe<Institution>(`/learning/institutions/${id}`)
}

// ---- Training categories ----------------------------------------------------

export interface TrainingCategory {
  id: string
  name: string
  isMandatory: boolean
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function fetchTrainingCategories(includeInactive = false) {
  return apiFetchSafe<TrainingCategory[]>(`/learning/training-categories${toQuery({ includeInactive })}`)
}

export function fetchTrainingCategory(id: string) {
  return apiFetchSafe<TrainingCategory>(`/learning/training-categories/${id}`)
}

// ---- Courses ----------------------------------------------------------------

interface NamedRef {
  id: string
  name: string
}

interface TitledRef {
  id: string
  title: string
}

export interface Course {
  id: string
  courseCode: string
  name: string
  description: string | null
  categoryId: string
  institutionId: string | null
  cost: number | null
  durationHours: number | null
  deliveryMethod: CourseDeliveryMethod
  startDate: string | null
  endDate: string | null

  requiredFunctionId: string | null
  requiredDepartmentId: string | null
  requiredUnitId: string | null
  requiredPositionId: string | null
  requiredLevelId: string | null
  requiredBandId: string | null
  requiredContractType: ContractType | null

  autoAssignOnHire: boolean
  autoAssignDueMonths: number | null
  isActive: boolean

  category: TrainingCategory
  institution: Institution | null
  requiredFunction: NamedRef | null
  requiredDepartment: NamedRef | null
  requiredUnit: NamedRef | null
  requiredPosition: TitledRef | null
  requiredLevel: NamedRef | null
  requiredBand: NamedRef | null

  createdAt: string
  updatedAt: string
}

export interface CourseFilters {
  categoryId?: string
  institutionId?: string
  deliveryMethod?: CourseDeliveryMethod
  includeInactive?: boolean
}

export function fetchCourses(filters: CourseFilters = {}) {
  return apiFetchSafe<Course[]>(`/learning/courses${toQuery(filters)}`)
}

export function fetchCoursesPaginated(filters: CourseFilters, page = 1, pageSize?: number) {
  return apiFetchSafe<PaginatedResult<Course>>(`/learning/courses${toQuery({ ...filters, page, pageSize })}`)
}

export function fetchCourse(id: string) {
  return apiFetchSafe<Course>(`/learning/courses/${id}`)
}

export interface EligibleEmployee {
  employeeNumber: string
  firstName: string
  lastName: string
}

export function fetchEligibleEmployees(courseId: string) {
  return apiFetchSafe<EligibleEmployee[]>(`/learning/courses/${courseId}/eligible-employees`)
}

// ---- Assignments --------------------------------------------------------------

interface AssignmentEmployeeSummary {
  employeeNumber: string
  firstName: string
  lastName: string
  profilePictureUrl: string | null
}

interface AssignmentPersonSummary {
  employeeNumber: string
  firstName: string
  lastName: string
}

export interface CourseAuditLogEntry {
  id: string
  action: string
  actorId: string | null
  actor: { firstName: string; lastName: string } | null
  notes: string | null
  createdAt: string
}

export interface CourseAssignment {
  id: string
  courseId: string
  employeeId: string
  assignedById: string | null
  verifiedById: string | null

  categoryName: string
  isMandatory: boolean
  departmentId: string | null
  unitId: string | null
  positionId: string | null
  levelId: string | null
  bandId: string | null
  branchId: string | null
  contractType: ContractType | null

  dueDate: string | null
  priority: CourseAssignmentPriority
  recommendationComment: string | null
  reasonForAssignment: string | null

  status: CourseAssignmentStatus

  assignedAt: string
  acceptedAt: string | null
  startedAt: string | null
  completedAt: string | null
  certificateUploadedAt: string | null
  certificateUrl: string | null
  employeeCertificateComment: string | null
  verifiedAt: string | null
  hrVerificationComment: string | null
  rejectedAt: string | null
  closedAt: string | null

  course: Course & { category: TrainingCategory; institution: Institution | null }
  employee: AssignmentEmployeeSummary
  assignedBy: AssignmentPersonSummary | null
  verifiedBy: AssignmentPersonSummary | null
  department: NamedRef | null
  unit: NamedRef | null
  position: TitledRef | null
  level: NamedRef | null
  band: NamedRef | null
  branch: NamedRef | null

  auditLogs?: CourseAuditLogEntry[]

  createdAt: string
  updatedAt: string
}

export interface AssignmentFilters {
  employeeId?: string
  courseId?: string
  categoryId?: string
  status?: CourseAssignmentStatus
  isMandatory?: boolean
  departmentId?: string
  branchId?: string
  priority?: CourseAssignmentPriority
  overdueOnly?: boolean
}

export function fetchAssignments(filters: AssignmentFilters, actingEmployeeId: string) {
  return apiFetchSafe<CourseAssignment[]>(`/learning/assignments${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchAssignmentsPaginated(
  filters: AssignmentFilters,
  actingEmployeeId: string,
  page = 1,
  pageSize?: number
) {
  return apiFetchSafe<PaginatedResult<CourseAssignment>>(
    `/learning/assignments${toQuery({ ...filters, actingEmployeeId, page, pageSize })}`
  )
}

export function fetchAssignment(id: string, actingEmployeeId: string) {
  return apiFetchSafe<CourseAssignment>(`/learning/assignments/${id}${toQuery({ actingEmployeeId })}`)
}

export interface LearningPlan {
  assigned: CourseAssignment[]
  completed: CourseAssignment[]
  overdue: CourseAssignment[]
  upcoming: CourseAssignment[]
  inProgress: CourseAssignment[]
  mandatory: CourseAssignment[]
  optional: CourseAssignment[]
  recommended: CourseAssignment[]
}

export function fetchLearningPlan(employeeId: string, actingEmployeeId: string) {
  return apiFetchSafe<LearningPlan>(
    `/learning/assignments/learning-plan/${employeeId}${toQuery({ actingEmployeeId })}`
  )
}

// ---- Analytics --------------------------------------------------------------

export interface LearningAnalyticsFilters {
  categoryId?: string
  institutionId?: string
  departmentId?: string
  branchId?: string
  functionId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  contractType?: ContractType
  isMandatory?: boolean
  employeeId?: string
}

export interface LearningOverview {
  totalCourses: number
  activeCourses: number
  mandatoryCourses: number
  optionalCourses: number
  totalAssignments: number
  completedAssignments: number
  completionRate: number
}

export interface ProgressBreakdown {
  notStarted: number
  accepted: number
  inProgress: number
  completedByEmployee: number
  pendingVerification: number
  verified: number
  rejected: number
  closed: number
  overdue: number
}

export interface ComplianceEntry {
  id: string
  name: string
  totalMandatory: number
  completedMandatory: number
  compliancePercent: number
}

export interface DepartmentLearningAnalysis {
  departmentId: string
  departmentName: string
  completionRate: number
  averageTrainingHours: number
  averageTrainingCost: number
  outstandingMandatoryCourses: number
}

export interface FunctionLearningAnalysis {
  functionId: string
  functionName: string
  completionRate: number
  averageTrainingHours: number
  averageTrainingCost: number
}

export interface InstitutionAnalysis {
  institutionId: string
  institutionName: string
  coursesDelivered: number
  totalCost: number
  averageCompletionRate: number
}

export interface CostAnalysis {
  totalCost: number
  costByDepartment: { departmentId: string; name: string; cost: number }[]
  costByInstitution: { institutionId: string; name: string; cost: number }[]
  costByCategory: { categoryName: string; name: string; cost: number }[]
  costPerEmployee: number
}

export interface EmployeeLearningProfile {
  totalAssigned: number
  totalCompleted: number
  mandatoryCompleted: number
  certificatesEarned: number
  totalTrainingHours: number
  totalTrainingCost: number
  currentlyInProgress: number
}

function analyticsQuery(filters: LearningAnalyticsFilters) {
  return toQuery(filters)
}

export function fetchLearningOverview(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<LearningOverview>(`/learning/analytics/overview${analyticsQuery(filters)}`)
}

export function fetchLearningProgressBreakdown(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<ProgressBreakdown>(`/learning/analytics/progress${analyticsQuery(filters)}`)
}

export function fetchComplianceByDepartment(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<ComplianceEntry[]>(`/learning/analytics/compliance/by-department${analyticsQuery(filters)}`)
}

export function fetchComplianceByBranch(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<ComplianceEntry[]>(`/learning/analytics/compliance/by-branch${analyticsQuery(filters)}`)
}

export function fetchComplianceByFunction(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<ComplianceEntry[]>(`/learning/analytics/compliance/by-function${analyticsQuery(filters)}`)
}

export function fetchComplianceByPosition(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<ComplianceEntry[]>(`/learning/analytics/compliance/by-position${analyticsQuery(filters)}`)
}

export function fetchComplianceByBand(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<ComplianceEntry[]>(`/learning/analytics/compliance/by-band${analyticsQuery(filters)}`)
}

export function fetchDepartmentAnalysis(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<DepartmentLearningAnalysis[]>(`/learning/analytics/department-analysis${analyticsQuery(filters)}`)
}

export function fetchFunctionAnalysis(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<FunctionLearningAnalysis[]>(`/learning/analytics/function-analysis${analyticsQuery(filters)}`)
}

export function fetchInstitutionAnalysis(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<InstitutionAnalysis[]>(`/learning/analytics/institution-analysis${analyticsQuery(filters)}`)
}

export function fetchCostAnalysis(filters: LearningAnalyticsFilters = {}) {
  return apiFetchSafe<CostAnalysis>(`/learning/analytics/cost-analysis${analyticsQuery(filters)}`)
}

export function fetchEmployeeLearningProfile(employeeId: string) {
  return apiFetchSafe<EmployeeLearningProfile>(`/learning/analytics/employee-profile/${employeeId}`)
}

export function fetchMyOverdueMandatory(actingEmployeeId: string) {
  return apiFetchSafe<CourseAssignment[]>(`/learning/analytics/my-overdue-mandatory${toQuery({ actingEmployeeId })}`)
}

export function fetchTeamOverdueMandatory(actingEmployeeId: string) {
  return apiFetchSafe<CourseAssignment[]>(`/learning/analytics/team-overdue-mandatory${toQuery({ actingEmployeeId })}`)
}
