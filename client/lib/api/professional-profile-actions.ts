"use server"

import { revalidatePath } from "next/cache"

import { ApiError, apiFetch } from "./client"
import { searchInstitutions, searchSkills } from "./professional-profile"
import type { AcademicInstitution, Certification, EducationRecord, EmployeeSkill, WorkExperience } from "./professional-profile"

// ---- Client-callable search (wraps the Server-Component fetchers so a
// "use client" combobox can call them directly as Server Actions) --------

export async function searchInstitutionsAction(query: string) {
  const result = await searchInstitutions(query)
  return result.ok ? result.data : []
}

export async function searchSkillsAction(query?: string) {
  const result = await searchSkills(query)
  return result.ok ? result.data : []
}

export interface ActionState {
  error?: string
  success?: boolean
}

function revalidateProfile(employeeId: string) {
  revalidatePath(`/staff/profile`)
  revalidatePath(`/admin/employees/${employeeId}`)
  revalidatePath("/admin/professional-profile/review")
}

// ---- Work Experience ---------------------------------------------------------

export async function addWorkExperience(employeeId: string, _prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const isCurrent = formData.get("isCurrent") === "on"
  const skillsUsed = String(formData.get("skillsUsed") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  try {
    await apiFetch<WorkExperience>("/work-experience", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        companyName: formData.get("companyName"),
        jobTitle: formData.get("jobTitle"),
        employmentType: formData.get("employmentType"),
        location: formData.get("location") || undefined,
        industry: formData.get("industry") || undefined,
        startDate: formData.get("startDate"),
        endDate: isCurrent ? undefined : formData.get("endDate") || undefined,
        isCurrent,
        description: formData.get("description") || undefined,
        skillsUsed,
      }),
    })
    revalidateProfile(employeeId)
    return { success: true }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add work experience." }
  }
}

export async function removeWorkExperience(id: string, employeeId: string) {
  await apiFetch(`/work-experience/${id}?employeeId=${employeeId}`, { method: "DELETE" })
  revalidateProfile(employeeId)
}

// ---- Education ---------------------------------------------------------------

export async function addEducationRecord(employeeId: string, actingEmployeeId: string, _prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const institutionId = String(formData.get("institutionId") ?? "")
  const institutionName = String(formData.get("institutionName") ?? "")

  if (!institutionId && !institutionName) {
    return { error: "Select an institution or enter one manually." }
  }

  try {
    await apiFetch<EducationRecord>("/education-records", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        actingEmployeeId,
        type: formData.get("type"),
        title: formData.get("title"),
        institutionId: institutionId || undefined,
        institutionName: institutionName || undefined,
        country: formData.get("country") || undefined,
        fieldOfStudy: formData.get("fieldOfStudy") || undefined,
        grade: formData.get("grade") || undefined,
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate") || undefined,
        graduationDate: formData.get("graduationDate") || undefined,
        certificateUrl: formData.get("certificateUrl") || undefined,
        certificateFileName: formData.get("certificateFileName") || undefined,
        description: formData.get("description") || undefined,
      }),
    })
    revalidateProfile(employeeId)
    return { success: true }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add education record." }
  }
}

export async function removeEducationRecord(id: string, employeeId: string) {
  await apiFetch(`/education-records/${id}?employeeId=${employeeId}`, { method: "DELETE" })
  revalidateProfile(employeeId)
}

export async function reviewEducationRecord(id: string, decision: "VERIFIED" | "REJECTED", actingEmployeeId: string, comment: string | undefined) {
  await apiFetch(`/education-records/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ decision, comment, actingEmployeeId }),
  })
  revalidatePath("/admin/professional-profile/review")
}

// ---- Certifications ------------------------------------------------------------

export async function addCertification(employeeId: string, actingEmployeeId: string, _prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  try {
    await apiFetch<Certification>("/profile-certifications", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        actingEmployeeId,
        name: formData.get("name"),
        issuer: formData.get("issuer"),
        certificateNumber: formData.get("certificateNumber") || undefined,
        issueDate: formData.get("issueDate"),
        expiryDate: formData.get("expiryDate") || undefined,
        certificateUrl: formData.get("certificateUrl") || undefined,
        certificateFileName: formData.get("certificateFileName") || undefined,
      }),
    })
    revalidateProfile(employeeId)
    return { success: true }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add certification." }
  }
}

export async function removeCertification(id: string, employeeId: string) {
  await apiFetch(`/profile-certifications/${id}?employeeId=${employeeId}`, { method: "DELETE" })
  revalidateProfile(employeeId)
}

export async function reviewCertification(id: string, decision: "VERIFIED" | "REJECTED", actingEmployeeId: string, comment: string | undefined) {
  await apiFetch(`/profile-certifications/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ decision, comment, actingEmployeeId }),
  })
  revalidatePath("/admin/professional-profile/review")
}

// ---- Institutions --------------------------------------------------------------

export async function addInstitutionManually(actingEmployeeId: string, name: string, country?: string, city?: string, website?: string) {
  return apiFetch<AcademicInstitution>("/institutions", {
    method: "POST",
    body: JSON.stringify({ name, country, city, website, actingEmployeeId }),
  })
}

export async function reviewInstitution(id: string, decision: "VERIFIED" | "REJECTED", actingEmployeeId: string, comment: string | undefined) {
  await apiFetch(`/institutions/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ decision, comment, actingEmployeeId }),
  })
  revalidatePath("/admin/professional-profile/review")
}

// ---- Skills ----------------------------------------------------------------------

export async function addCustomSkill(actingEmployeeId: string, name: string, category?: string) {
  return apiFetch<{ id: string; name: string; category: string }>("/skills", {
    method: "POST",
    body: JSON.stringify({ name, category, actingEmployeeId }),
  })
}

export async function assignSkillToEmployee(employeeId: string, skillId: string, level: string) {
  await apiFetch<EmployeeSkill>("/skills/employee-skills", {
    method: "POST",
    body: JSON.stringify({ employeeId, skillId, level }),
  })
  revalidateProfile(employeeId)
}

export async function removeEmployeeSkill(id: string, employeeId: string) {
  await apiFetch(`/skills/employee-skills/${id}?employeeId=${employeeId}`, { method: "DELETE" })
  revalidateProfile(employeeId)
}

// ---- About / Summary -------------------------------------------------------------

export async function updateProfileSummary(employeeId: string, _prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  try {
    await apiFetch(`/professional-profile/${employeeId}/summary`, {
      method: "PATCH",
      body: JSON.stringify({
        professionalSummary: formData.get("professionalSummary") || undefined,
        careerInterests: formData.get("careerInterests") || undefined,
      }),
    })
    revalidateProfile(employeeId)
    return { success: true }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to save your profile summary." }
  }
}
