"use server"

import { revalidatePath } from "next/cache"

import { apiFetch, ApiError } from "./client"

export interface ExitDocumentActionState {
  error?: string
}

/** Document types affect the config catalog and (indirectly) every
 *  employee's exit checklist — revalidate broadly rather than tracking
 *  exact employee paths (same reasoning as revalidateOnboardingPaths()). */
function revalidateExitDocumentPaths(employeeId?: string) {
  revalidatePath("/admin/employees")
  if (employeeId) revalidatePath(`/admin/employees/${employeeId}`)
}

export async function bulkAssignExitDocumentsForm(employeeId: string, assignedById: string, formData: FormData): Promise<void> {
  const documentTypeIds = formData.getAll("documentTypeIds").map(String)
  if (documentTypeIds.length === 0) return
  try {
    await apiFetch("/exit-documents/assignments/bulk", {
      method: "POST",
      body: JSON.stringify({ employeeId, documentTypeIds, assignedById }),
    })
  } catch {
    // Void-returning form action — see reviewOnboardingDocumentForm's doc
    // comment (onboarding-documents-actions.ts) for why errors are
    // swallowed here rather than surfaced.
  }
  revalidateExitDocumentPaths(employeeId)
}

export async function completeExitDocument(
  assignmentId: string,
  actingEmployeeId: string,
  isCompleted: boolean,
  employeeId: string,
  notes?: string
): Promise<ExitDocumentActionState> {
  try {
    await apiFetch(`/exit-documents/assignments/${assignmentId}/complete`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, isCompleted, notes }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the exit document." }
  }
  revalidateExitDocumentPaths(employeeId)
  return {}
}
