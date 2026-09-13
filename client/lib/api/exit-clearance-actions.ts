"use server"

import { revalidatePath } from "next/cache"

import { apiFetch, ApiError } from "./client"

export interface ExitClearanceActionState {
  error?: string
}

/** Templates affect the config catalog and (indirectly) every exiting
 *  employee's clearance checklist — revalidate broadly rather than tracking
 *  exact employee paths (same reasoning as revalidateExitDocumentPaths()). */
function revalidateExitClearancePaths(employeeId?: string) {
  revalidatePath("/admin/employees")
  revalidatePath("/admin/exit-clearance")
  revalidatePath("/staff/exit-clearance")
  revalidatePath("/staff/exit-clearance/reviews")
  if (employeeId) revalidatePath(`/admin/employees/${employeeId}`)
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function createClearanceFormTemplate(
  _prevState: ExitClearanceActionState | undefined,
  formData: FormData
): Promise<ExitClearanceActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  const responsibleDepartmentId = trimmedOrUndefined(formData.get("responsibleDepartmentId"))
  const responsiblePositionId = trimmedOrUndefined(formData.get("responsiblePositionId"))

  if (!name || !responsibleDepartmentId || !responsiblePositionId) {
    return { error: "Name, responsible department, and responsible position are required." }
  }

  try {
    await apiFetch("/exit-clearance/templates", {
      method: "POST",
      body: JSON.stringify({
        name,
        description: trimmedOrUndefined(formData.get("description")),
        isMandatory: formData.get("isMandatory") === "on",
        responsibleDepartmentId,
        responsiblePositionId,
        requiresEmployeeCompletion: formData.get("requiresEmployeeCompletion") === "on",
        requiresConfirmation: formData.get("requiresConfirmation") === "on",
        requiresSignature: formData.get("requiresSignature") === "on",
        daysToComplete: Number(formData.get("daysToComplete")) || undefined,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create exit clearance form." }
  }

  revalidateExitClearancePaths()
  return {}
}

export async function updateClearanceFormTemplate(
  id: string,
  _prevState: ExitClearanceActionState | undefined,
  formData: FormData
): Promise<ExitClearanceActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  const responsibleDepartmentId = trimmedOrUndefined(formData.get("responsibleDepartmentId"))
  const responsiblePositionId = trimmedOrUndefined(formData.get("responsiblePositionId"))

  if (!name || !responsibleDepartmentId || !responsiblePositionId) {
    return { error: "Name, responsible department, and responsible position are required." }
  }

  try {
    await apiFetch(`/exit-clearance/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        description: trimmedOrUndefined(formData.get("description")),
        isMandatory: formData.get("isMandatory") === "on",
        responsibleDepartmentId,
        responsiblePositionId,
        requiresEmployeeCompletion: formData.get("requiresEmployeeCompletion") === "on",
        requiresConfirmation: formData.get("requiresConfirmation") === "on",
        requiresSignature: formData.get("requiresSignature") === "on",
        daysToComplete: Number(formData.get("daysToComplete")) || undefined,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update exit clearance form." }
  }

  revalidateExitClearancePaths()
  return {}
}

export async function deactivateClearanceFormTemplate(id: string) {
  await apiFetch(`/exit-clearance/templates/${id}`, { method: "DELETE" })
  revalidateExitClearancePaths()
}

export async function completeExitClearanceForm(assignmentId: string, employeeId: string): Promise<ExitClearanceActionState> {
  try {
    await apiFetch(`/exit-clearance/assignments/${assignmentId}/complete`, {
      method: "POST",
      body: JSON.stringify({ employeeId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to mark this form complete." }
  }
  revalidateExitClearancePaths(employeeId)
  return {}
}

export async function reviewExitClearanceForm(
  assignmentId: string,
  reviewerId: string,
  decision: "APPROVE" | "RETURN",
  comment?: string
): Promise<ExitClearanceActionState> {
  try {
    await apiFetch(`/exit-clearance/assignments/${assignmentId}/review`, {
      method: "POST",
      body: JSON.stringify({ reviewerId, decision, comment }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit your review." }
  }
  revalidateExitClearancePaths()
  return {}
}
