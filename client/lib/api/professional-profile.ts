import { apiFetchSafe } from "./client"

// ---- Types (mirrors the new Professional Profile Prisma models) --------

export type PriorEmploymentType = "PERMANENT" | "TEMPORARY" | "CONTRACT" | "INTERNSHIP" | "CONSULTANCY"
export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
export type RecordVerificationStatus = "PENDING_REVIEW" | "VERIFIED" | "REJECTED"
export type CertificationStatus = "ACTIVE" | "EXPIRED"

export interface WorkExperience {
  id: string
  employeeId: string
  companyName: string
  jobTitle: string
  employmentType: PriorEmploymentType
  location: string | null
  industry: string | null
  startDate: string
  endDate: string | null
  isCurrent: boolean
  description: string | null
  skillsUsed: string[]
}

export interface AcademicInstitution {
  id: string
  name: string
  country: string | null
  city: string | null
  website: string | null
  verificationStatus: RecordVerificationStatus
  addedById: string | null
  createdAt: string
}

export interface EducationRecord {
  id: string
  employeeId: string
  type: string
  title: string
  institution: string
  institutionId: string | null
  institutionRef: AcademicInstitution | null
  country: string | null
  fieldOfStudy: string | null
  grade: string | null
  startDate: string
  endDate: string | null
  graduationDate: string | null
  certificateUrl: string | null
  certificateFileName: string | null
  description: string | null
  verificationStatus: RecordVerificationStatus
  hrComment: string | null
  verifiedBy: { employeeNumber: string; firstName: string; lastName: string } | null
  addedBy: { employeeNumber: string; firstName: string; lastName: string } | null
  employee?: { employeeNumber: string; firstName: string; lastName: string; email: string }
}

export interface Certification {
  id: string
  employeeId: string
  name: string
  issuer: string
  certificateNumber: string | null
  issueDate: string
  expiryDate: string | null
  certificateUrl: string | null
  certificateFileName: string | null
  status: CertificationStatus
  verificationStatus: RecordVerificationStatus
  hrComment: string | null
  verifiedBy: { employeeNumber: string; firstName: string; lastName: string } | null
  addedBy: { employeeNumber: string; firstName: string; lastName: string } | null
  employee?: { employeeNumber: string; firstName: string; lastName: string; email: string }
}

export interface Skill {
  id: string
  name: string
  category: string
}

export interface EmployeeSkill {
  id: string
  employeeId: string
  skillId: string
  level: SkillLevel
  skill: Skill
}

export interface FullProfile {
  employee: {
    employeeNumber: string
    firstName: string
    lastName: string
    profilePictureUrl: string | null
    professionalSummary: string | null
    careerInterests: string | null
    position: { title: string; department: { name: string } } | null
  }
  workExperience: WorkExperience[]
  education: EducationRecord[]
  certifications: Certification[]
  skills: EmployeeSkill[]
  isOwnerOrAdmin: boolean
}

// ---- Fetchers (Server Components) -----------------------------------------

export function fetchFullProfile(employeeId: string, viewerEmployeeId?: string) {
  return apiFetchSafe<FullProfile>(`/professional-profile/${employeeId}${viewerEmployeeId ? `?viewerEmployeeId=${viewerEmployeeId}` : ""}`)
}

export function fetchWorkExperience(employeeId: string) {
  return apiFetchSafe<WorkExperience[]>(`/work-experience/employee/${employeeId}`)
}

export function fetchEducationRecords(employeeId: string) {
  return apiFetchSafe<EducationRecord[]>(`/education-records/employee/${employeeId}`)
}

export function fetchPendingEducation() {
  return apiFetchSafe<EducationRecord[]>("/education-records/pending-review")
}

export function fetchCertifications(employeeId: string) {
  return apiFetchSafe<Certification[]>(`/profile-certifications/employee/${employeeId}`)
}

export function fetchPendingCertifications() {
  return apiFetchSafe<Certification[]>("/profile-certifications/pending-review")
}

export function searchInstitutions(query: string) {
  return apiFetchSafe<AcademicInstitution[]>(`/institutions?q=${encodeURIComponent(query)}`)
}

export function fetchPendingInstitutions() {
  return apiFetchSafe<AcademicInstitution[]>("/institutions/pending-review")
}

export function searchSkills(query?: string) {
  return apiFetchSafe<Skill[]>(`/skills${query ? `?q=${encodeURIComponent(query)}` : ""}`)
}

export function fetchEmployeeSkills(employeeId: string) {
  return apiFetchSafe<EmployeeSkill[]>(`/skills/employee/${employeeId}`)
}

// ---- Analytics --------------------------------------------------------------

export function fetchEducationByLevel() {
  return apiFetchSafe<{ key: string; count: number }[]>("/profile-analytics/education-by-level")
}

export function fetchEducationByInstitution() {
  return apiFetchSafe<{ key: string; count: number }[]>("/profile-analytics/education-by-institution")
}

export function fetchEducationByField() {
  return apiFetchSafe<{ key: string; count: number }[]>("/profile-analytics/education-by-field")
}

export function fetchMostCommonSkills() {
  return apiFetchSafe<{ key: string; count: number }[]>("/profile-analytics/skills-most-common")
}

export function fetchSkillsByDepartment() {
  return apiFetchSafe<{ department: string; topSkills: { key: string; count: number }[] }[]>("/profile-analytics/skills-by-department")
}

export function fetchAvailableExpertise() {
  return apiFetchSafe<{ skill: string; category: string; employeeCount: number }[]>("/profile-analytics/skills-available-expertise")
}

export function fetchCertificationSummary() {
  return apiFetchSafe<{
    active: number
    expired: number
    expiringWindowDays: number
    expiringSoon: (Certification & { employee: { employeeNumber: string; firstName: string; lastName: string } })[]
  }>("/profile-analytics/certifications-summary")
}

export function fetchCertificationsByDepartment() {
  return apiFetchSafe<{ key: string; count: number }[]>("/profile-analytics/certifications-by-department")
}
