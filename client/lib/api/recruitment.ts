import { apiFetchSafe } from "./client"
import type { ContractType } from "./employees"
import type { PaginatedResult } from "./pagination"

// ---- Enums ------------------------------------------------------------------

export type RecruitmentEmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP"
export type RecruitmentPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type WorkforcePlanStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
export type HiringReason = "NEW_POSITION" | "REPLACEMENT" | "EXPANSION" | "TEMPORARY_REQUIREMENT"
export type RequisitionStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CLOSED"
export type RecruitmentStageName =
  | "WORKFORCE_PLANNING"
  | "JOB_REQUISITION"
  | "JOB_DESCRIPTION"
  | "APPROVAL"
  | "JOB_POSTING"
  | "APPLICATIONS"
  | "SCREENING"
  | "ASSESSMENT"
  | "INTERVIEWS"
  | "BACKGROUND_CHECK"
  | "OFFER"
  | "ONBOARDING"
export type StageStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
export type JobPostingStatus = "DRAFT" | "PUBLISHED" | "CLOSED"
export type ApplicationStatus =
  | "APPLIED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN"
export type ScreeningDecision = "SHORTLIST" | "REJECT" | "HOLD" | "RECOMMEND"
export type AssessmentType = "TECHNICAL_TEST" | "APTITUDE_TEST" | "PRACTICAL_EXERCISE" | "PSYCHOMETRIC_ASSESSMENT" | "COMPLIANCE_TEST"
export type AssessmentResult = "PENDING" | "PASS" | "FAIL"
export type InterviewType = "HR_INTERVIEW" | "TECHNICAL_INTERVIEW" | "MANAGER_INTERVIEW" | "EXECUTIVE_INTERVIEW"
export type InterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED"
export type InterviewRecommendation = "STRONG_HIRE" | "HIRE" | "CONSIDER" | "DO_NOT_HIRE"
export type BackgroundCheckType =
  | "EMPLOYMENT_VERIFICATION"
  | "EDUCATION_VERIFICATION"
  | "CRIMINAL_RECORD_CHECK"
  | "PROFESSIONAL_REFERENCES"
  | "IDENTITY_VERIFICATION"
export type BackgroundCheckStatus = "PENDING" | "PASSED" | "FAILED"
export type OfferStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED"
export type OnboardingTaskType =
  | "EMPLOYEE_NUMBER_CREATED"
  | "SYSTEM_ACCOUNTS_CREATED"
  | "ID_CARD_ISSUED"
  | "LAPTOP_ASSIGNED"
  | "WORKSPACE_ASSIGNED"
  | "MANDATORY_AML_TRAINING_ASSIGNED"
  | "HR_ORIENTATION_SCHEDULED"
  | "MANAGER_ORIENTATION_SCHEDULED"
  | "DOCUMENTS_SIGNED"

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

function toQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

interface NamedRef {
  id: string
  name: string
}

interface TitledRef {
  id: string
  title: string
}

interface EmployeeRef {
  employeeNumber: string
  firstName: string
  lastName: string
}

// ---- Workforce Plans ----------------------------------------------------

export interface WorkforcePlan {
  id: string
  title: string
  departmentId: string
  unitId: string | null
  branchId: string
  hiringManagerId: string
  recruiterId: string
  numberOfPositions: number
  employmentType: RecruitmentEmploymentType
  priority: RecruitmentPriority
  expectedHiringDate: string | null
  businessJustification: string
  budget: number | null
  status: WorkforcePlanStatus
  approvedById: string | null
  approvedAt: string | null
  rejectionComment: string | null
  department: NamedRef
  unit: NamedRef | null
  branch: NamedRef
  hiringManager: EmployeeRef
  recruiter: EmployeeRef
  approvedBy: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export interface WorkforcePlanFilters {
  departmentId?: string
  branchId?: string
  status?: WorkforcePlanStatus
}

export function fetchWorkforcePlans(filters: WorkforcePlanFilters, actingEmployeeId: string) {
  return apiFetchSafe<WorkforcePlan[]>(`/recruitment/workforce-plans${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchWorkforcePlansPaginated(filters: WorkforcePlanFilters, actingEmployeeId: string, page = 1, pageSize?: number) {
  return apiFetchSafe<PaginatedResult<WorkforcePlan>>(
    `/recruitment/workforce-plans${toQuery({ ...filters, actingEmployeeId, page, pageSize })}`
  )
}

export function fetchWorkforcePlan(id: string, actingEmployeeId: string) {
  return apiFetchSafe<WorkforcePlan>(`/recruitment/workforce-plans/${id}${toQuery({ actingEmployeeId })}`)
}

// ---- Job Requisitions -----------------------------------------------------

export interface JobRequisition {
  id: string
  workforcePlanId: string
  positionId: string
  departmentId: string
  unitId: string | null
  functionId: string
  bandId: string
  reportsToPositionId: string | null
  numberOfVacancies: number
  contractType: ContractType
  branchId: string
  employmentType: RecruitmentEmploymentType
  hiringReason: HiringReason
  requestedById: string
  hiringManagerId: string
  recruiterId: string
  priority: RecruitmentPriority
  targetStartDate: string | null
  jobDescriptionId: string | null
  status: RequisitionStatus
  approvedById: string | null
  approvedAt: string | null
  rejectionComment: string | null
  workforcePlan: { id: string; title: string }
  position: TitledRef
  reportsToPosition: TitledRef | null
  department: NamedRef
  unit: NamedRef | null
  function: NamedRef
  band: NamedRef
  branch: NamedRef
  jobDescription: { id: string; jobTitle: string } | null
  requestedBy: EmployeeRef
  hiringManager: EmployeeRef
  recruiter: EmployeeRef
  approvedBy: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export interface RequisitionFilters {
  departmentId?: string
  branchId?: string
  status?: RequisitionStatus
  recruiterId?: string
}

export function fetchRequisitions(filters: RequisitionFilters, actingEmployeeId: string) {
  return apiFetchSafe<JobRequisition[]>(`/recruitment/requisitions${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchRequisitionsPaginated(filters: RequisitionFilters, actingEmployeeId: string, page = 1, pageSize?: number) {
  return apiFetchSafe<PaginatedResult<JobRequisition>>(
    `/recruitment/requisitions${toQuery({ ...filters, actingEmployeeId, page, pageSize })}`
  )
}

export function fetchRequisition(id: string, actingEmployeeId: string) {
  return apiFetchSafe<JobRequisition>(`/recruitment/requisitions/${id}${toQuery({ actingEmployeeId })}`)
}

export interface RecruitmentStageInstance {
  id: string
  requisitionId: string
  stage: RecruitmentStageName
  plannedStart: string | null
  plannedEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  ownerId: string | null
  status: StageStatus
  comments: string | null
  owner: EmployeeRef | null
  createdAt: string
  updatedAt: string
}

export function fetchRequisitionStages(requisitionId: string, actingEmployeeId: string) {
  return apiFetchSafe<RecruitmentStageInstance[]>(
    `/recruitment/requisitions/${requisitionId}/stages${toQuery({ actingEmployeeId })}`
  )
}

// ---- Job Descriptions -----------------------------------------------------

export interface JobDescription {
  id: string
  jobTitle: string
  jobSummary: string
  keyResponsibilities: string
  requiredQualifications: string
  requiredCertifications: string | null
  requiredExperience: string | null
  requiredSkills: string | null
  technicalCompetencies: string | null
  behaviouralCompetencies: string | null
  requiredLevelId: string | null
  requiredBandId: string | null
  reportingManagerPositionId: string | null
  workLocation: string | null
  isActive: boolean
  requiredLevel: NamedRef | null
  requiredBand: NamedRef | null
  reportingManagerPosition: TitledRef | null
  createdAt: string
  updatedAt: string
}

export function fetchJobDescriptions(includeInactive = false) {
  return apiFetchSafe<JobDescription[]>(`/recruitment/job-descriptions${toQuery({ includeInactive })}`)
}

export function fetchJobDescription(id: string) {
  return apiFetchSafe<JobDescription>(`/recruitment/job-descriptions/${id}`)
}

// ---- Job Postings -----------------------------------------------------------

export interface JobPosting {
  id: string
  requisitionId: string
  postingTitle: string
  isInternal: boolean
  isExternal: boolean
  closingDate: string
  description: string
  responsibilities: string
  qualifications: string
  branchId: string
  employmentType: RecruitmentEmploymentType
  requiredExperience: string | null
  status: JobPostingStatus
  publishedAt: string | null
  closedAt: string | null
  requisition: { id: string; recruiterId: string; hiringManagerId: string; departmentId: string; position: TitledRef }
  branch: NamedRef
  _count: { applications: number }
  createdAt: string
  updatedAt: string
}

export interface JobPostingFilters {
  status?: JobPostingStatus
  requisitionId?: string
  branchId?: string
}

export function fetchJobPostings(filters: JobPostingFilters, actingEmployeeId: string) {
  return apiFetchSafe<JobPosting[]>(`/recruitment/job-postings${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchJobPosting(id: string, actingEmployeeId: string) {
  return apiFetchSafe<JobPosting>(`/recruitment/job-postings/${id}${toQuery({ actingEmployeeId })}`)
}

export function fetchOpenJobPostings() {
  return apiFetchSafe<JobPosting[]>(`/recruitment/job-postings/open`)
}

// ---- Candidates -------------------------------------------------------------

export interface Candidate {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  cvUrl: string | null
  coverLetterUrl: string | null
  education: string | null
  experience: string | null
  certifications: string | null
  skills: string | null
  references: string | null
  applications?: { id: string; status: ApplicationStatus; appliedAt: string; jobPosting: { id: string; postingTitle: string; status: JobPostingStatus } }[]
  createdAt: string
  updatedAt: string
}

export function fetchCandidates(search?: string) {
  return apiFetchSafe<Candidate[]>(`/recruitment/candidates${toQuery({ search })}`)
}

export function fetchCandidatesPaginated(search?: string, page = 1, pageSize?: number) {
  return apiFetchSafe<PaginatedResult<Candidate>>(`/recruitment/candidates${toQuery({ search, page, pageSize })}`)
}

export function fetchCandidate(id: string) {
  return apiFetchSafe<Candidate>(`/recruitment/candidates/${id}`)
}

// ---- Applications -------------------------------------------------------------

export interface Application {
  id: string
  candidateId: string
  jobPostingId: string
  status: ApplicationStatus
  appliedAt: string
  hiredEmployeeNumber: string | null
  /** Null only for applications created before the configurable stage
   *  engine existed — see ApplicationStagesService for the fine-grained
   *  pipeline this backs. */
  workflowId: string | null
  currentStageId: string | null
  overallScore: number | null
  candidate: Candidate
  jobPosting: { id: string; postingTitle: string; requisition: { id: string; recruiterId: string; hiringManagerId: string; departmentId: string } }
  screening: { id: string; decision: ScreeningDecision; comments: string | null; screenedById: string; screenedAt: string; screenedBy: EmployeeRef } | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationFilters {
  jobPostingId?: string
  status?: ApplicationStatus
}

export function fetchApplications(filters: ApplicationFilters, actingEmployeeId: string) {
  return apiFetchSafe<Application[]>(`/recruitment/applications${toQuery({ ...filters, actingEmployeeId })}`)
}

export function fetchApplication(id: string, actingEmployeeId: string) {
  return apiFetchSafe<Application>(`/recruitment/applications/${id}${toQuery({ actingEmployeeId })}`)
}

// ---- Assessments -------------------------------------------------------------

export interface Assessment {
  id: string
  applicationId: string
  assessmentType: AssessmentType
  scheduledDate: string | null
  score: number | null
  maxScore: number | null
  result: AssessmentResult
  evaluatorId: string | null
  comments: string | null
  evaluator: EmployeeRef | null
  application: { id: string; candidate: { id: string; firstName: string; lastName: string }; jobPosting: { id: string; postingTitle: string } }
  createdAt: string
  updatedAt: string
}

export function fetchAssessments(applicationId: string | undefined, actingEmployeeId: string) {
  return apiFetchSafe<Assessment[]>(`/recruitment/assessments${toQuery({ applicationId, actingEmployeeId })}`)
}

// ---- Interviews ---------------------------------------------------------------

export interface Interview {
  id: string
  applicationId: string
  interviewType: InterviewType
  interviewDate: string
  location: string | null
  notes: string | null
  recommendation: InterviewRecommendation | null
  status: InterviewStatus
  panelists: { id: string; employee: EmployeeRef }[]
  application: { id: string; candidate: { id: string; firstName: string; lastName: string }; jobPosting: { id: string; postingTitle: string } }
  createdAt: string
  updatedAt: string
}

export function fetchInterviews(applicationId: string | undefined, actingEmployeeId: string) {
  return apiFetchSafe<Interview[]>(`/recruitment/interviews${toQuery({ applicationId, actingEmployeeId })}`)
}

// ---- Background Checks ---------------------------------------------------------

export interface BackgroundCheck {
  id: string
  applicationId: string
  checkType: BackgroundCheckType
  status: BackgroundCheckStatus
  comments: string | null
  completedAt: string | null
  application: { id: string; candidate: { id: string; firstName: string; lastName: string }; jobPosting: { id: string; postingTitle: string } }
  createdAt: string
  updatedAt: string
}

export function fetchBackgroundChecks(applicationId: string | undefined, actingEmployeeId: string) {
  return apiFetchSafe<BackgroundCheck[]>(`/recruitment/background-checks${toQuery({ applicationId, actingEmployeeId })}`)
}

// ---- Offers ---------------------------------------------------------------------

export interface Offer {
  id: string
  applicationId: string
  positionId: string
  departmentId: string
  branchId: string
  contractType: ContractType
  bandId: string
  proposedStartDate: string
  expiryDate: string
  offerLetterUrl: string | null
  status: OfferStatus
  sentAt: string | null
  respondedAt: string | null
  createdById: string
  position: TitledRef
  department: NamedRef
  branch: NamedRef
  band: NamedRef
  createdBy: EmployeeRef
  application: {
    id: string
    candidateId: string
    candidate: { id: string; firstName: string; lastName: string; email: string }
    jobPosting: { id: string; postingTitle: string }
  }
  createdAt: string
  updatedAt: string
}

export function fetchOffers(applicationId: string | undefined, actingEmployeeId: string) {
  return apiFetchSafe<Offer[]>(`/recruitment/offers${toQuery({ applicationId, actingEmployeeId })}`)
}

export function fetchOffer(id: string, actingEmployeeId: string) {
  return apiFetchSafe<Offer>(`/recruitment/offers/${id}${toQuery({ actingEmployeeId })}`)
}

// ---- Onboarding -------------------------------------------------------------------

export interface OnboardingTask {
  id: string
  applicationId: string
  taskType: OnboardingTaskType
  isCompleted: boolean
  completedAt: string | null
  completedById: string | null
  notes: string | null
  completedBy: EmployeeRef | null
}

export function fetchOnboardingTasks(applicationId: string, actingEmployeeId: string) {
  return apiFetchSafe<OnboardingTask[]>(
    `/recruitment/applications/${applicationId}/onboarding/tasks${toQuery({ actingEmployeeId })}`
  )
}

// ---- Analytics ----------------------------------------------------------------------

export interface RecruitmentOverview {
  openRequisitions: number
  activeApplications: number
  interviewsThisWeek: number
  pendingOffers: number
  hiresThisMonth: number
}

export function fetchRecruitmentOverview(actingEmployeeId: string) {
  return apiFetchSafe<RecruitmentOverview>(`/recruitment/analytics/overview${toQuery({ actingEmployeeId })}`)
}

export function fetchRecruitmentFunnel(actingEmployeeId: string) {
  return apiFetchSafe<{ status: ApplicationStatus; count: number }[]>(
    `/recruitment/analytics/funnel${toQuery({ actingEmployeeId })}`
  )
}

export function fetchOfferStats(actingEmployeeId: string) {
  return apiFetchSafe<{ byStatus: Record<string, number>; acceptanceRate: number | null }>(
    `/recruitment/analytics/offer-stats${toQuery({ actingEmployeeId })}`
  )
}

export function fetchTimeToHire(actingEmployeeId: string) {
  return apiFetchSafe<{ averageDays: number | null; sampleSize: number }>(
    `/recruitment/analytics/time-to-hire${toQuery({ actingEmployeeId })}`
  )
}

export function fetchVacanciesByDepartment(actingEmployeeId: string) {
  return apiFetchSafe<{ departmentId: string; departmentName: string; openRequisitions: number; vacancies: number }[]>(
    `/recruitment/analytics/vacancies-by-department${toQuery({ actingEmployeeId })}`
  )
}

export function fetchVacanciesByBranch(actingEmployeeId: string) {
  return apiFetchSafe<{ branchId: string; branchName: string; openRequisitions: number; vacancies: number }[]>(
    `/recruitment/analytics/vacancies-by-branch${toQuery({ actingEmployeeId })}`
  )
}

export function fetchBudgetByDepartment(actingEmployeeId: string) {
  return apiFetchSafe<{ departmentId: string; departmentName: string; approvedBudget: number }[]>(
    `/recruitment/analytics/budget-by-department${toQuery({ actingEmployeeId })}`
  )
}

// ---- Configurable Candidate Pipeline ("ATS stage engine") --------------------
// Separate from RecruitmentStageName/StageStatus above, which track a
// requisition's own fixed 12-phase project timeline — see the schema's doc
// comment on RecruitmentStageType for why this is its own model family.

export type RecruitmentStageType = "SCREENING" | "REVIEW" | "TEST" | "INTERVIEW" | "ASSESSMENT_CENTRE" | "DECISION" | "OFFER" | "ADMIN"
export type ApplicationStageStatus = "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED" | "ON_HOLD" | "SKIPPED"

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

export interface ScoringCriterion {
  id: string
  stageId: string
  name: string
  description: string | null
  maxScore: number
  sortOrder: number
  isActive: boolean
}

export interface RecruitmentStageDefinition {
  id: string
  key: string
  name: string
  description: string | null
  stageType: RecruitmentStageType
  isScored: boolean
  isSystem: boolean
  isActive: boolean
  sortOrderHint: number
  scoringCriteria: ScoringCriterion[]
}

export function fetchStageDefinitions(includeInactive = false) {
  return apiFetchSafe<RecruitmentStageDefinition[]>(`/recruitment/stage-definitions${toQuery({ includeInactive: includeInactive || undefined })}`)
}

export function fetchStageDefinition(id: string) {
  return apiFetchSafe<RecruitmentStageDefinition>(`/recruitment/stage-definitions/${id}`)
}

export interface RecruitmentWorkflow {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  minBandRank: number | null
  maxBandRank: number | null
  contractTypes: ContractType[]
  stages: { id: string; sequence: number; isRequired: boolean; stage: RecruitmentStageDefinition }[]
}

export function fetchWorkflows(includeInactive = false) {
  return apiFetchSafe<RecruitmentWorkflow[]>(`/recruitment/workflows${toQuery({ includeInactive: includeInactive || undefined })}`)
}

export function fetchWorkflow(id: string) {
  return apiFetchSafe<RecruitmentWorkflow>(`/recruitment/workflows/${id}`)
}

export interface ApplicationStageScore {
  id: string
  criterionId: string
  score: number
  comments: string | null
  criterion: ScoringCriterion
}

export interface ApplicationStageInstance {
  id: string
  applicationId: string
  stageId: string
  sequence: number
  status: ApplicationStageStatus
  score: number | null
  startedAt: string | null
  completedAt: string | null
  decidedById: string | null
  comments: string | null
  stage: RecruitmentStageDefinition
  decidedBy: EmployeeRef | null
  scores: ApplicationStageScore[]
}

export function fetchApplicationPipeline(applicationId: string, actingEmployeeId: string) {
  return apiFetchSafe<ApplicationStageInstance[]>(`/recruitment/applications/${applicationId}/pipeline${toQuery({ actingEmployeeId })}`)
}

export interface CandidateRankingEntry {
  rank: number
  applicationId: string
  candidateName: string
  candidateEmail: string
  currentStageName: string | null
  status: ApplicationStatus
  overallScore: number | null
}

export function fetchCandidateRanking(jobPostingId: string, actingEmployeeId: string) {
  return apiFetchSafe<CandidateRankingEntry[]>(`/recruitment/job-postings/${jobPostingId}/ranking${toQuery({ actingEmployeeId })}`)
}
