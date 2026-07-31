"use server"

import { revalidatePath } from "next/cache"

import { apiFetch, ApiError } from "./client"

export interface OnboardingActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Document type CRUD affects the config list, the applicable-documents
 *  lookup used on the employee page, and (indirectly) every employee's
 *  onboarding section — revalidate broadly rather than tracking exact
 *  employee paths (same reasoning as revalidateErPaths()). */
function revalidateOnboardingPaths() {
  revalidatePath("/admin/onboarding-documents")
  revalidatePath("/admin/employees")
  revalidatePath("/staff/onboarding")
}

// ---- Document types -----------------------------------------------------------

export async function createDocumentType(_prevState: OnboardingActionState | undefined, formData: FormData): Promise<OnboardingActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  const category = trimmedOrUndefined(formData.get("category"))
  if (!name || !category) {
    return { error: "Name and category are required." }
  }
  try {
    await apiFetch("/onboarding-documents/document-types", {
      method: "POST",
      body: JSON.stringify({
        name,
        category,
        description: trimmedOrUndefined(formData.get("description")),
        isMandatory: formData.get("isMandatory") === "on",
        applicableContractTypes: formData.getAll("applicableContractTypes"),
        applicableFunctionIds: formData.getAll("applicableFunctionIds"),
        applicableDepartmentIds: formData.getAll("applicableDepartmentIds"),
        applicablePositionIds: formData.getAll("applicablePositionIds"),
        applicableBandIds: formData.getAll("applicableBandIds"),
        effectiveDate: trimmedOrUndefined(formData.get("effectiveDate")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the document type." }
  }
  revalidateOnboardingPaths()
  return {}
}

export async function updateDocumentType(id: string, _prevState: OnboardingActionState | undefined, formData: FormData): Promise<OnboardingActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  const category = trimmedOrUndefined(formData.get("category"))
  if (!name || !category) {
    return { error: "Name and category are required." }
  }
  try {
    await apiFetch(`/onboarding-documents/document-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        category,
        description: trimmedOrUndefined(formData.get("description")),
        isMandatory: formData.get("isMandatory") === "on",
        applicableContractTypes: formData.getAll("applicableContractTypes"),
        applicableFunctionIds: formData.getAll("applicableFunctionIds"),
        applicableDepartmentIds: formData.getAll("applicableDepartmentIds"),
        applicablePositionIds: formData.getAll("applicablePositionIds"),
        applicableBandIds: formData.getAll("applicableBandIds"),
        effectiveDate: trimmedOrUndefined(formData.get("effectiveDate")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the document type." }
  }
  revalidateOnboardingPaths()
  return {}
}

export async function deleteDocumentType(id: string): Promise<OnboardingActionState> {
  try {
    await apiFetch(`/onboarding-documents/document-types/${id}`, { method: "DELETE" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to remove the document type." }
  }
  revalidateOnboardingPaths()
  return {}
}

/** Void-returning wrapper for the bare `<form action={...}>` deactivate
 *  button — see deleteSanctionTypeForm's doc comment for why this wrapper
 *  exists alongside the error-surfacing version above. */
export async function deleteDocumentTypeForm(id: string): Promise<void> {
  await deleteDocumentType(id)
}

// ---- Assignments ----------------------------------------------------------------

export async function bulkAssignDocuments(
  employeeId: string,
  assignedById: string,
  _prevState: OnboardingActionState | undefined,
  formData: FormData
): Promise<OnboardingActionState> {
  const documentTypeIds = formData.getAll("documentTypeIds").map(String)
  if (documentTypeIds.length === 0) {
    return { error: "Select at least one document to assign." }
  }
  try {
    await apiFetch("/onboarding-documents/assignments/bulk", {
      method: "POST",
      body: JSON.stringify({ employeeId, documentTypeIds, assignedById }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to assign the selected documents." }
  }
  revalidateOnboardingPaths()
  revalidatePath(`/admin/employees/${employeeId}`)
  return {}
}

/** Void-returning wrapper for the "Assign selected" bare `<form
 *  action={...}>` on the employee profile page — see
 *  deleteSanctionTypeForm's doc comment for why a `Promise<OnboardingActionState>`-
 *  returning action can't be bound directly into a plain form action. Bound
 *  with (employeeId, assignedById), leaving `formData` as the sole
 *  remaining parameter the form supplies. */
export async function bulkAssignDocumentsForm(employeeId: string, assignedById: string, formData: FormData): Promise<void> {
  await bulkAssignDocuments(employeeId, assignedById, undefined, formData)
}

export async function uploadOnboardingDocument(assignmentId: string, actingEmployeeId: string, fileUrl: string): Promise<OnboardingActionState> {
  try {
    await apiFetch(`/onboarding-documents/assignments/${assignmentId}/upload`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, fileUrl }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to upload the document." }
  }
  revalidateOnboardingPaths()
  return {}
}

export async function reviewOnboardingDocument(
  assignmentId: string,
  actingEmployeeId: string,
  status: string,
  employeeId: string,
  reviewComments?: string
): Promise<OnboardingActionState> {
  try {
    await apiFetch(`/onboarding-documents/assignments/${assignmentId}/review`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, status, reviewComments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to review the document." }
  }
  revalidateOnboardingPaths()
  revalidatePath(`/admin/employees/${employeeId}`)
  return {}
}

/** Void-returning wrapper for the Approve/Reject/Request-resubmission bare
 *  `<form action={...}>` buttons on the employee profile page — fully
 *  bound (no remaining formData use), so this just discards the
 *  error-surfacing return value. See bulkAssignDocumentsForm's doc comment. */
export async function reviewOnboardingDocumentForm(
  assignmentId: string,
  actingEmployeeId: string,
  status: string,
  employeeId: string,
  reviewComments: string | undefined
): Promise<void> {
  await reviewOnboardingDocument(assignmentId, actingEmployeeId, status, employeeId, reviewComments)
}
