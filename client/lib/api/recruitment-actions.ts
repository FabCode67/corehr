"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { apiFetch, ApiError } from "./client"

export interface RecruitmentActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Every mutation below can affect the dashboard, the pipeline views, and
 *  every filter combination on the list pages — revalidate broadly rather
 *  than tracking exact paths (same reasoning as revalidateLearningPaths()). */
function revalidateRecruitmentPaths() {
  revalidatePath("/admin/recruitment")
}

// ---- Workforce Plans --------------------------------------------------------

export async function createWorkforcePlan(
  _prevState: RecruitmentActionState | undefined,
  formData: FormData
): Promise<RecruitmentActionState> {
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const title = trimmedOrUndefined(formData.get("title"))
  const departmentId = trimmedOrUndefined(formData.get("departmentId"))
  const branchId = trimmedOrUndefined(formData.get("branchId"))
  const hiringManagerId = trimmedOrUndefined(formData.get("hiringManagerId"))
  const recruiterId = trimmedOrUndefined(formData.get("recruiterId"))
  const numberOfPositions = trimmedOrUndefined(formData.get("numberOfPositions"))
  const employmentType = trimmedOrUndefined(formData.get("employmentType"))
  const businessJustification = trimmedOrUndefined(formData.get("businessJustification"))

  if (!actingEmployeeId || !title || !departmentId || !branchId || !hiringManagerId || !recruiterId || !numberOfPositions || !employmentType || !businessJustification) {
    return { error: "Title, department, branch, hiring manager, recruiter, number of positions, employment type, and business justification are all required." }
  }

  let planId: string
  try {
    const plan = await apiFetch<{ id: string }>(`/recruitment/workforce-plans?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({
        title,
        departmentId,
        unitId: trimmedOrUndefined(formData.get("unitId")),
        branchId,
        hiringManagerId,
        recruiterId,
        numberOfPositions: Number(numberOfPositions),
        employmentType,
        priority: trimmedOrUndefined(formData.get("priority")),
        expectedHiringDate: trimmedOrUndefined(formData.get("expectedHiringDate")),
        businessJustification,
        budget: trimmedOrUndefined(formData.get("budget")) ? Number(formData.get("budget")) : undefined,
      }),
    })
    planId = plan.id
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the workforce plan." }
  }

  revalidateRecruitmentPaths()
  redirect(`/admin/recruitment/workforce-plans/${planId}`)
}

export async function submitWorkforcePlan(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/workforce-plans/${id}/submit`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit the workforce plan." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function approveWorkforcePlan(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/workforce-plans/${id}/approve`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to approve the workforce plan." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function rejectWorkforcePlan(id: string, actingEmployeeId: string, rejectionComment: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/workforce-plans/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, rejectionComment }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to reject the workforce plan." }
  }
  revalidateRecruitmentPaths()
  return {}
}

// ---- Job Requisitions --------------------------------------------------------

export async function createRequisition(
  _prevState: RecruitmentActionState | undefined,
  formData: FormData
): Promise<RecruitmentActionState> {
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const workforcePlanId = trimmedOrUndefined(formData.get("workforcePlanId"))
  const positionId = trimmedOrUndefined(formData.get("positionId"))
  const newPositionTitle = trimmedOrUndefined(formData.get("newPositionTitle"))
  const bandId = trimmedOrUndefined(formData.get("bandId"))
  const numberOfVacancies = trimmedOrUndefined(formData.get("numberOfVacancies"))
  const contractType = trimmedOrUndefined(formData.get("contractType"))
  const branchId = trimmedOrUndefined(formData.get("branchId"))
  const employmentType = trimmedOrUndefined(formData.get("employmentType"))
  const hiringReason = trimmedOrUndefined(formData.get("hiringReason"))
  const requestedById = trimmedOrUndefined(formData.get("requestedById"))
  const hiringManagerId = trimmedOrUndefined(formData.get("hiringManagerId"))

  if (!actingEmployeeId || !workforcePlanId || !bandId || !numberOfVacancies || !contractType || !branchId || !employmentType || !hiringReason || !requestedById || !hiringManagerId) {
    return { error: "All required requisition fields must be filled in." }
  }
  if (!positionId && !newPositionTitle) {
    return { error: "Select an existing position or provide a title for a new one." }
  }

  const newPosition = !positionId
    ? {
        title: newPositionTitle,
        departmentId: trimmedOrUndefined(formData.get("newPositionDepartmentId")),
        unitId: trimmedOrUndefined(formData.get("newPositionUnitId")),
        levelId: trimmedOrUndefined(formData.get("newPositionLevelId")),
        reportsToPositionId: trimmedOrUndefined(formData.get("newPositionReportsToPositionId")),
      }
    : undefined

  if (newPosition && (!newPosition.departmentId || !newPosition.levelId)) {
    return { error: "A new position needs a department and level." }
  }

  let requisitionId: string
  try {
    const requisition = await apiFetch<{ id: string }>(`/recruitment/requisitions?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({
        workforcePlanId,
        positionId,
        newPosition,
        bandId,
        numberOfVacancies: Number(numberOfVacancies),
        contractType,
        branchId,
        employmentType,
        hiringReason,
        requestedById,
        hiringManagerId,
        priority: trimmedOrUndefined(formData.get("priority")),
        targetStartDate: trimmedOrUndefined(formData.get("targetStartDate")),
        jobDescriptionId: trimmedOrUndefined(formData.get("jobDescriptionId")),
      }),
    })
    requisitionId = requisition.id
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the job requisition." }
  }

  revalidateRecruitmentPaths()
  redirect(`/admin/recruitment/requisitions/${requisitionId}`)
}

export async function submitRequisition(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/requisitions/${id}/submit`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit the requisition." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function approveRequisition(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/requisitions/${id}/approve`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to approve the requisition." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function rejectRequisition(id: string, actingEmployeeId: string, rejectionComment: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/requisitions/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, rejectionComment }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to reject the requisition." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function closeRequisition(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/requisitions/${id}/close`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to close the requisition." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function reopenRequisition(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/requisitions/${id}/reopen`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to reopen the requisition." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function updateRequisitionStage(
  requisitionId: string,
  stage: string,
  actingEmployeeId: string,
  fields: { plannedStart?: string; plannedEnd?: string; actualStart?: string; actualEnd?: string; ownerId?: string; status?: string; comments?: string }
): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/requisitions/${requisitionId}/stages/${stage}`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, ...fields }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the stage." }
  }
  revalidateRecruitmentPaths()
  return {}
}

// ---- Job Descriptions --------------------------------------------------------

export async function createJobDescription(
  _prevState: RecruitmentActionState | undefined,
  formData: FormData
): Promise<RecruitmentActionState> {
  const jobTitle = trimmedOrUndefined(formData.get("jobTitle"))
  const jobSummary = trimmedOrUndefined(formData.get("jobSummary"))
  const keyResponsibilities = trimmedOrUndefined(formData.get("keyResponsibilities"))
  const requiredQualifications = trimmedOrUndefined(formData.get("requiredQualifications"))

  if (!jobTitle || !jobSummary || !keyResponsibilities || !requiredQualifications) {
    return { error: "Job title, summary, key responsibilities, and required qualifications are required." }
  }

  try {
    await apiFetch("/recruitment/job-descriptions", {
      method: "POST",
      body: JSON.stringify({
        jobTitle,
        jobSummary,
        keyResponsibilities,
        requiredQualifications,
        requiredCertifications: trimmedOrUndefined(formData.get("requiredCertifications")),
        requiredExperience: trimmedOrUndefined(formData.get("requiredExperience")),
        requiredSkills: trimmedOrUndefined(formData.get("requiredSkills")),
        technicalCompetencies: trimmedOrUndefined(formData.get("technicalCompetencies")),
        behaviouralCompetencies: trimmedOrUndefined(formData.get("behaviouralCompetencies")),
        requiredLevelId: trimmedOrUndefined(formData.get("requiredLevelId")),
        requiredBandId: trimmedOrUndefined(formData.get("requiredBandId")),
        reportingManagerId: trimmedOrUndefined(formData.get("reportingManagerId")),
        workLocation: trimmedOrUndefined(formData.get("workLocation")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the job description." }
  }

  revalidateRecruitmentPaths()
  redirect("/admin/recruitment/job-descriptions")
}

// ---- Job Postings --------------------------------------------------------------

export async function createJobPosting(
  _prevState: RecruitmentActionState | undefined,
  formData: FormData
): Promise<RecruitmentActionState> {
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const requisitionId = trimmedOrUndefined(formData.get("requisitionId"))
  const postingTitle = trimmedOrUndefined(formData.get("postingTitle"))
  const closingDate = trimmedOrUndefined(formData.get("closingDate"))
  const description = trimmedOrUndefined(formData.get("description"))
  const responsibilities = trimmedOrUndefined(formData.get("responsibilities"))
  const qualifications = trimmedOrUndefined(formData.get("qualifications"))
  const branchId = trimmedOrUndefined(formData.get("branchId"))
  const employmentType = trimmedOrUndefined(formData.get("employmentType"))

  if (!actingEmployeeId || !requisitionId || !postingTitle || !closingDate || !description || !responsibilities || !qualifications || !branchId || !employmentType) {
    return { error: "All job posting fields are required." }
  }

  let postingId: string
  try {
    const posting = await apiFetch<{ id: string }>(`/recruitment/job-postings?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({
        requisitionId,
        postingTitle,
        isInternal: formData.get("isInternal") === "on" || formData.get("isInternal") === "true",
        isExternal: formData.get("isExternal") === "on" || formData.get("isExternal") === "true",
        closingDate,
        description,
        responsibilities,
        qualifications,
        branchId,
        employmentType,
        requiredExperience: trimmedOrUndefined(formData.get("requiredExperience")),
      }),
    })
    postingId = posting.id
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the job posting." }
  }

  revalidateRecruitmentPaths()
  redirect(`/admin/recruitment/job-postings/${postingId}`)
}

export async function publishJobPosting(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/job-postings/${id}/publish`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to publish the job posting." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function closeJobPosting(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/job-postings/${id}/close`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to close the job posting." }
  }
  revalidateRecruitmentPaths()
  return {}
}

// ---- Candidates & Applications --------------------------------------------------

export async function createCandidate(
  _prevState: RecruitmentActionState | undefined,
  formData: FormData
): Promise<RecruitmentActionState & { id?: string }> {
  const firstName = trimmedOrUndefined(formData.get("firstName"))
  const lastName = trimmedOrUndefined(formData.get("lastName"))
  const email = trimmedOrUndefined(formData.get("email"))
  const phone = trimmedOrUndefined(formData.get("phone"))
  const nationality = trimmedOrUndefined(formData.get("nationality"))

  if (!firstName || !lastName || !email || !phone || !nationality) {
    return { error: "First name, last name, email, phone, and nationality are required." }
  }

  try {
    const candidate = await apiFetch<{ id: string }>("/recruitment/candidates", {
      method: "POST",
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        nationality,
        cvUrl: trimmedOrUndefined(formData.get("cvUrl")),
        education: trimmedOrUndefined(formData.get("education")),
        experience: trimmedOrUndefined(formData.get("experience")),
        skills: trimmedOrUndefined(formData.get("skills")),
      }),
    })
    revalidateRecruitmentPaths()
    return { id: candidate.id }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the candidate." }
  }
}

export async function createApplication(candidateId: string, jobPostingId: string, actingEmployeeId: string): Promise<RecruitmentActionState & { id?: string }> {
  try {
    const application = await apiFetch<{ id: string }>(`/recruitment/applications?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({ candidateId, jobPostingId }),
    })
    revalidateRecruitmentPaths()
    return { id: application.id }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to record the application." }
  }
}

export async function updateApplicationStatus(id: string, actingEmployeeId: string, status: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, status }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the application status." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function screenApplication(
  id: string,
  actingEmployeeId: string,
  screenedById: string,
  decision: string,
  comments?: string
): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/applications/${id}/screen?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({ screenedById, decision, comments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to record the screening decision." }
  }
  revalidateRecruitmentPaths()
  return {}
}

// ---- Assessments -----------------------------------------------------------------

export async function createAssessment(
  applicationId: string,
  actingEmployeeId: string,
  assessmentType: string,
  scheduledDate?: string,
  evaluatorId?: string
): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/assessments?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({ applicationId, assessmentType, scheduledDate, evaluatorId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to schedule the assessment." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function recordAssessmentResult(
  id: string,
  actingEmployeeId: string,
  result: string,
  score?: number,
  maxScore?: number,
  comments?: string
): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/assessments/${id}/result`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, result, score, maxScore, comments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to record the assessment result." }
  }
  revalidateRecruitmentPaths()
  return {}
}

// ---- Interviews ------------------------------------------------------------------

export async function createInterview(
  applicationId: string,
  actingEmployeeId: string,
  interviewType: string,
  interviewDate: string,
  location?: string,
  panelistIds?: string[]
): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/interviews?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({ applicationId, interviewType, interviewDate, location, panelistIds }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to schedule the interview." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function recordInterviewOutcome(
  id: string,
  actingEmployeeId: string,
  recommendation: string,
  notes?: string
): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/interviews/${id}/outcome`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, recommendation, notes }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to record the interview outcome." }
  }
  revalidateRecruitmentPaths()
  return {}
}

// ---- Background Checks -----------------------------------------------------------

export async function createBackgroundCheck(applicationId: string, actingEmployeeId: string, checkType: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/background-checks?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({ applicationId, checkType }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to initiate the background check." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function updateBackgroundCheckStatus(
  id: string,
  actingEmployeeId: string,
  status: string,
  comments?: string
): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/background-checks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, status, comments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the background check." }
  }
  revalidateRecruitmentPaths()
  return {}
}

// ---- Offers ------------------------------------------------------------------------

export async function createOffer(
  _prevState: RecruitmentActionState | undefined,
  formData: FormData
): Promise<RecruitmentActionState> {
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const applicationId = trimmedOrUndefined(formData.get("applicationId"))
  const bandId = trimmedOrUndefined(formData.get("bandId"))
  const contractType = trimmedOrUndefined(formData.get("contractType"))
  const proposedStartDate = trimmedOrUndefined(formData.get("proposedStartDate"))
  const expiryDate = trimmedOrUndefined(formData.get("expiryDate"))
  const createdById = trimmedOrUndefined(formData.get("createdById"))

  if (!actingEmployeeId || !applicationId || !bandId || !contractType || !proposedStartDate || !expiryDate || !createdById) {
    return { error: "All offer fields are required." }
  }

  try {
    await apiFetch(`/recruitment/offers?actingEmployeeId=${actingEmployeeId}`, {
      method: "POST",
      body: JSON.stringify({
        applicationId,
        bandId,
        contractType,
        proposedStartDate,
        expiryDate,
        offerLetterUrl: trimmedOrUndefined(formData.get("offerLetterUrl")),
        createdById,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the offer." }
  }

  revalidateRecruitmentPaths()
  redirect(`/admin/recruitment/applications/${applicationId}`)
}

export async function sendOffer(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/offers/${id}/send`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to send the offer." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function acceptOffer(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/offers/${id}/accept`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to accept the offer." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function declineOffer(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/offers/${id}/decline`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to decline the offer." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function expireOffer(id: string, actingEmployeeId: string): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/offers/${id}/expire`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to expire the offer." }
  }
  revalidateRecruitmentPaths()
  return {}
}

// ---- Onboarding --------------------------------------------------------------------

export async function updateOnboardingTask(
  applicationId: string,
  taskType: string,
  actingEmployeeId: string,
  isCompleted: boolean,
  notes?: string
): Promise<RecruitmentActionState> {
  try {
    await apiFetch(`/recruitment/applications/${applicationId}/onboarding/tasks/${taskType}`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, isCompleted, notes }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the onboarding task." }
  }
  revalidateRecruitmentPaths()
  return {}
}

export async function completeOnboarding(
  _prevState: RecruitmentActionState | undefined,
  formData: FormData
): Promise<RecruitmentActionState> {
  const applicationId = trimmedOrUndefined(formData.get("applicationId"))
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const gender = trimmedOrUndefined(formData.get("gender"))
  const dateOfBirth = trimmedOrUndefined(formData.get("dateOfBirth"))
  const nationalIdNumber = trimmedOrUndefined(formData.get("nationalIdNumber"))
  const maritalStatus = trimmedOrUndefined(formData.get("maritalStatus"))

  if (!applicationId || !actingEmployeeId || !gender || !dateOfBirth || !nationalIdNumber || !maritalStatus) {
    return { error: "Gender, date of birth, national ID number, and marital status are required to complete onboarding." }
  }

  try {
    await apiFetch(`/recruitment/applications/${applicationId}/onboarding/complete`, {
      method: "POST",
      body: JSON.stringify({
        actingEmployeeId,
        gender,
        dateOfBirth,
        nationalIdNumber,
        maritalStatus,
        profilePictureUrl: trimmedOrUndefined(formData.get("profilePictureUrl")),
        employmentStartDate: trimmedOrUndefined(formData.get("employmentStartDate")),
        probationEndDate: trimmedOrUndefined(formData.get("probationEndDate")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to complete onboarding." }
  }

  revalidateRecruitmentPaths()
  redirect(`/admin/recruitment/applications/${applicationId}`)
}
