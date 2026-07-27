"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { apiFetch, ApiError } from "./client"
import type { CourseAssignmentPriority, CourseDeliveryMethod } from "./learning"

export interface LearningActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Every mutation below can affect the catalogue, learning plans, the
 *  dashboard, and every filter combination on the assignments list —
 *  revalidate broadly rather than tracking exact paths (same reasoning as
 *  revalidatePerformancePaths()). */
function revalidateLearningPaths() {
  revalidatePath("/admin/learning")
  revalidatePath("/admin/learning/institutions")
  revalidatePath("/admin/learning/training-categories")
  revalidatePath("/admin/learning/courses")
  revalidatePath("/admin/learning/assignments")
  revalidatePath("/admin/learning/dashboard")
  revalidatePath("/staff/learning")
}

// ---- Institutions (HR admin) ------------------------------------------------

export async function createInstitution(
  _prevState: LearningActionState | undefined,
  formData: FormData
): Promise<LearningActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  if (!name) {
    return { error: "Name is required." }
  }

  try {
    await apiFetch("/learning/institutions", {
      method: "POST",
      body: JSON.stringify({
        name,
        contactEmail: trimmedOrUndefined(formData.get("contactEmail")),
        contactPhone: trimmedOrUndefined(formData.get("contactPhone")),
        website: trimmedOrUndefined(formData.get("website")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the institution." }
  }

  revalidateLearningPaths()
  redirect("/admin/learning/institutions")
}

export async function updateInstitution(
  id: string,
  _prevState: LearningActionState | undefined,
  formData: FormData
): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/institutions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: trimmedOrUndefined(formData.get("name")),
        contactEmail: trimmedOrUndefined(formData.get("contactEmail")),
        contactPhone: trimmedOrUndefined(formData.get("contactPhone")),
        website: trimmedOrUndefined(formData.get("website")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the institution." }
  }

  revalidateLearningPaths()
  return {}
}

export async function deactivateInstitution(id: string) {
  await apiFetch(`/learning/institutions/${id}`, { method: "DELETE" })
  revalidateLearningPaths()
}

// ---- Training categories (HR admin) -----------------------------------------

export async function createTrainingCategory(
  _prevState: LearningActionState | undefined,
  formData: FormData
): Promise<LearningActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  if (!name) {
    return { error: "Name is required." }
  }

  try {
    await apiFetch("/learning/training-categories", {
      method: "POST",
      body: JSON.stringify({
        name,
        isMandatory: formData.get("isMandatory") === "on" || formData.get("isMandatory") === "true",
        description: trimmedOrUndefined(formData.get("description")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the training category." }
  }

  revalidateLearningPaths()
  redirect("/admin/learning/training-categories")
}

export async function updateTrainingCategory(
  id: string,
  _prevState: LearningActionState | undefined,
  formData: FormData
): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/training-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: trimmedOrUndefined(formData.get("name")),
        isMandatory: formData.get("isMandatory") === "on" || formData.get("isMandatory") === "true",
        description: trimmedOrUndefined(formData.get("description")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the training category." }
  }

  revalidateLearningPaths()
  return {}
}

export async function deactivateTrainingCategory(id: string) {
  await apiFetch(`/learning/training-categories/${id}`, { method: "DELETE" })
  revalidateLearningPaths()
}

// ---- Courses (HR admin) ------------------------------------------------------

function courseFieldsFromForm(formData: FormData) {
  const cost = trimmedOrUndefined(formData.get("cost"))
  const durationHours = trimmedOrUndefined(formData.get("durationHours"))
  const autoAssignDueMonths = trimmedOrUndefined(formData.get("autoAssignDueMonths"))
  const startDate = trimmedOrUndefined(formData.get("startDate"))
  const endDate = trimmedOrUndefined(formData.get("endDate"))

  return {
    name: trimmedOrUndefined(formData.get("name")),
    description: trimmedOrUndefined(formData.get("description")),
    categoryId: trimmedOrUndefined(formData.get("categoryId")),
    institutionId: trimmedOrUndefined(formData.get("institutionId")),
    cost: cost ? Number(cost) : undefined,
    durationHours: durationHours ? Number(durationHours) : undefined,
    deliveryMethod: trimmedOrUndefined(formData.get("deliveryMethod")) as CourseDeliveryMethod | undefined,
    startDate,
    endDate,
    requiredFunctionId: trimmedOrUndefined(formData.get("requiredFunctionId")),
    requiredDepartmentId: trimmedOrUndefined(formData.get("requiredDepartmentId")),
    requiredUnitId: trimmedOrUndefined(formData.get("requiredUnitId")),
    requiredPositionId: trimmedOrUndefined(formData.get("requiredPositionId")),
    requiredLevelId: trimmedOrUndefined(formData.get("requiredLevelId")),
    requiredBandId: trimmedOrUndefined(formData.get("requiredBandId")),
    requiredContractType: trimmedOrUndefined(formData.get("requiredContractType")),
    autoAssignOnHire: formData.get("autoAssignOnHire") === "on" || formData.get("autoAssignOnHire") === "true",
    autoAssignDueMonths: autoAssignDueMonths ? Number(autoAssignDueMonths) : undefined,
  }
}

export async function createCourse(
  _prevState: LearningActionState | undefined,
  formData: FormData
): Promise<LearningActionState> {
  const fields = courseFieldsFromForm(formData)
  if (!fields.name || !fields.categoryId || !fields.deliveryMethod) {
    return { error: "Course name, training category, and delivery method are required." }
  }

  let courseId: string
  try {
    const course = await apiFetch<{ id: string }>("/learning/courses", {
      method: "POST",
      body: JSON.stringify(fields),
    })
    courseId = course.id
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the course." }
  }

  revalidateLearningPaths()
  redirect(`/admin/learning/courses/${courseId}`)
}

export async function updateCourse(
  id: string,
  _prevState: LearningActionState | undefined,
  formData: FormData
): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(courseFieldsFromForm(formData)),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the course." }
  }

  revalidateLearningPaths()
  return {}
}

export async function deactivateCourse(id: string) {
  await apiFetch(`/learning/courses/${id}/deactivate`, { method: "PATCH" })
  revalidateLearningPaths()
}

// ---- Assignments --------------------------------------------------------------

export async function createAssignment(
  _prevState: LearningActionState | undefined,
  formData: FormData
): Promise<LearningActionState & { id?: string }> {
  const courseId = trimmedOrUndefined(formData.get("courseId"))
  const employeeId = trimmedOrUndefined(formData.get("employeeId"))
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))

  if (!courseId || !employeeId || !actingEmployeeId) {
    return { error: "Course and employee are required." }
  }

  try {
    const assignment = await apiFetch<{ id: string }>("/learning/assignments", {
      method: "POST",
      body: JSON.stringify({
        courseId,
        employeeId,
        actingEmployeeId,
        dueDate: trimmedOrUndefined(formData.get("dueDate")),
        priority: trimmedOrUndefined(formData.get("priority")) as CourseAssignmentPriority | undefined,
        recommendationComment: trimmedOrUndefined(formData.get("recommendationComment")),
        reasonForAssignment: trimmedOrUndefined(formData.get("reasonForAssignment")),
      }),
    })
    revalidateLearningPaths()
    return { id: assignment.id }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to assign the course." }
  }
}

export async function updateAssignment(
  id: string,
  actingEmployeeId: string,
  fields: { dueDate?: string; priority?: CourseAssignmentPriority; recommendationComment?: string; reasonForAssignment?: string }
): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, ...fields }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the assignment." }
  }

  revalidateLearningPaths()
  return {}
}

export async function acceptAssignment(id: string, actingEmployeeId: string): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/assignments/${id}/accept`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to confirm enrollment." }
  }

  revalidateLearningPaths()
  return {}
}

export async function startAssignment(id: string, actingEmployeeId: string): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/assignments/${id}/start`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to mark the course as started." }
  }

  revalidateLearningPaths()
  return {}
}

export async function markAssignmentCompleted(id: string, actingEmployeeId: string): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/assignments/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to confirm completion." }
  }

  revalidateLearningPaths()
  return {}
}

export async function submitCertificate(
  id: string,
  actingEmployeeId: string,
  certificateUrl: string,
  employeeCertificateComment?: string
): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/assignments/${id}/submit-certificate`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, certificateUrl, employeeCertificateComment }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit the certificate." }
  }

  revalidateLearningPaths()
  return {}
}

export async function verifyCertificate(
  id: string,
  actingEmployeeId: string,
  hrVerificationComment?: string
): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/assignments/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, hrVerificationComment }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to verify the certificate." }
  }

  revalidateLearningPaths()
  return {}
}

export async function rejectCertificate(
  id: string,
  actingEmployeeId: string,
  hrVerificationComment: string
): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/assignments/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, hrVerificationComment }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to reject the certificate." }
  }

  revalidateLearningPaths()
  return {}
}

export async function closeAssignment(id: string, actingEmployeeId: string): Promise<LearningActionState> {
  try {
    await apiFetch(`/learning/assignments/${id}/close`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to close the assignment." }
  }

  revalidateLearningPaths()
  return {}
}
