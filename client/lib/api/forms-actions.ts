"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { apiFetch, ApiError } from "./client"

export interface FormsActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Every mutation below can affect the Form Tracking Dashboard, My Forms,
 *  Pending Signatures, and every filter combination on the list pages —
 *  revalidate broadly rather than tracking exact paths (same reasoning as
 *  revalidateRecruitmentPaths()). */
function revalidateFormsPaths() {
  revalidatePath("/admin/forms")
}

// ---- Categories -----------------------------------------------------------------

export async function createFormCategory(
  _prevState: FormsActionState | undefined,
  formData: FormData
): Promise<FormsActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  if (!name) {
    return { error: "Name is required." }
  }

  try {
    await apiFetch("/forms/categories", {
      method: "POST",
      body: JSON.stringify({ name, description: trimmedOrUndefined(formData.get("description")) }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the category." }
  }

  revalidateFormsPaths()
  redirect("/admin/forms/categories")
}

export async function updateFormCategory(
  id: string,
  _prevState: FormsActionState | undefined,
  formData: FormData
): Promise<FormsActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  if (!name) {
    return { error: "Name is required." }
  }

  try {
    await apiFetch(`/forms/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description: trimmedOrUndefined(formData.get("description")) }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the category." }
  }
  revalidateFormsPaths()
  return {}
}

export async function deleteFormCategory(id: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/categories/${id}`, { method: "DELETE" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to delete the category." }
  }
  revalidateFormsPaths()
  return {}
}

/** Plain `<form action={...}>` elements require a `(formData) => void |
 *  Promise<void>` handler — deleteFormCategory returns `Promise<FormsActionState>`
 *  for callers that can surface the error, so this void-returning wrapper is
 *  what the bare delete button in the categories list binds to instead. */
export async function deleteFormCategoryForm(id: string): Promise<void> {
  await deleteFormCategory(id)
}

// ---- Templates --------------------------------------------------------------------

export async function createFormTemplate(
  _prevState: FormsActionState | undefined,
  formData: FormData
): Promise<FormsActionState> {
  const title = trimmedOrUndefined(formData.get("title"))
  const formCode = trimmedOrUndefined(formData.get("formCode"))
  const description = trimmedOrUndefined(formData.get("description"))
  const categoryId = trimmedOrUndefined(formData.get("categoryId"))
  const createdById = trimmedOrUndefined(formData.get("createdById"))

  if (!title || !formCode || !description || !categoryId || !createdById) {
    return { error: "Title, form code, description, category, and creator are required." }
  }

  let templateId: string
  try {
    const template = await apiFetch<{ id: string }>("/forms/templates", {
      method: "POST",
      body: JSON.stringify({
        title,
        formCode,
        description,
        categoryId,
        createdById,
        purpose: trimmedOrUndefined(formData.get("purpose")),
        requirementsInstructions: trimmedOrUndefined(formData.get("requirementsInstructions")),
        applicableDepartmentId: trimmedOrUndefined(formData.get("applicableDepartmentId")),
        applicableEmployeeCategory: trimmedOrUndefined(formData.get("applicableEmployeeCategory")),
      }),
    })
    templateId = template.id
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the form template." }
  }

  revalidateFormsPaths()
  redirect(`/admin/forms/templates/${templateId}`)
}

export async function updateFormTemplate(
  id: string,
  _prevState: FormsActionState | undefined,
  formData: FormData
): Promise<FormsActionState> {
  const title = trimmedOrUndefined(formData.get("title"))
  const description = trimmedOrUndefined(formData.get("description"))
  const categoryId = trimmedOrUndefined(formData.get("categoryId"))

  if (!title || !description || !categoryId) {
    return { error: "Title, description, and category are required." }
  }

  try {
    await apiFetch(`/forms/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        description,
        categoryId,
        purpose: trimmedOrUndefined(formData.get("purpose")),
        requirementsInstructions: trimmedOrUndefined(formData.get("requirementsInstructions")),
        applicableDepartmentId: trimmedOrUndefined(formData.get("applicableDepartmentId")),
        applicableEmployeeCategory: trimmedOrUndefined(formData.get("applicableEmployeeCategory")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the form template." }
  }
  revalidateFormsPaths()
  return {}
}

export async function publishFormTemplate(id: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${id}/publish`, { method: "POST" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to publish the form template." }
  }
  revalidateFormsPaths()
  return {}
}

export async function archiveFormTemplate(id: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${id}/archive`, { method: "POST" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to archive the form template." }
  }
  revalidateFormsPaths()
  return {}
}

export async function createNewTemplateVersion(id: string): Promise<FormsActionState & { id?: string }> {
  try {
    const template = await apiFetch<{ id: string }>(`/forms/templates/${id}/new-version`, { method: "POST" })
    revalidateFormsPaths()
    return { id: template.id }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create a new version." }
  }
}

export interface FieldInput {
  fieldType: string
  label: string
  helpText?: string
  isRequired?: boolean
  order: number
  options?: { value: string; label: string }[]
  tableColumns?: { key: string; label: string; type: string }[]
}

export async function addFormField(templateId: string, field: FieldInput): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${templateId}/fields`, { method: "POST", body: JSON.stringify(field) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add the field." }
  }
  revalidateFormsPaths()
  return {}
}

export async function updateFormField(templateId: string, fieldId: string, field: Partial<FieldInput>): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${templateId}/fields/${fieldId}`, { method: "PATCH", body: JSON.stringify(field) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the field." }
  }
  revalidateFormsPaths()
  return {}
}

export async function removeFormField(templateId: string, fieldId: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${templateId}/fields/${fieldId}`, { method: "DELETE" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to remove the field." }
  }
  revalidateFormsPaths()
  return {}
}

export async function reorderFormFields(templateId: string, fieldIds: string[]): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${templateId}/fields`, { method: "PATCH", body: JSON.stringify({ fieldIds }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to reorder the fields." }
  }
  revalidateFormsPaths()
  return {}
}

export interface StageInput {
  stageOrder: number
  role: string
  specificApproverId?: string
  label?: string
}

export async function addSignatureStage(templateId: string, stage: StageInput): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${templateId}/stages`, { method: "POST", body: JSON.stringify(stage) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add the signature stage." }
  }
  revalidateFormsPaths()
  return {}
}

export async function updateSignatureStage(templateId: string, stageId: string, stage: Partial<StageInput>): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${templateId}/stages/${stageId}`, { method: "PATCH", body: JSON.stringify(stage) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the signature stage." }
  }
  revalidateFormsPaths()
  return {}
}

export async function removeSignatureStage(templateId: string, stageId: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/templates/${templateId}/stages/${stageId}`, { method: "DELETE" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to remove the signature stage." }
  }
  revalidateFormsPaths()
  return {}
}

// ---- Instances --------------------------------------------------------------------

export async function assignForm(
  _prevState: FormsActionState | undefined,
  formData: FormData
): Promise<FormsActionState> {
  const formTemplateId = trimmedOrUndefined(formData.get("formTemplateId"))
  const employeeId = trimmedOrUndefined(formData.get("employeeId"))
  const assignedById = trimmedOrUndefined(formData.get("assignedById"))

  if (!formTemplateId || !employeeId || !assignedById) {
    return { error: "Form template, employee, and assigner are all required." }
  }

  try {
    await apiFetch("/forms/instances", {
      method: "POST",
      body: JSON.stringify({
        formTemplateId,
        employeeId,
        assignedById,
        dueDate: trimmedOrUndefined(formData.get("dueDate")),
        instructions: trimmedOrUndefined(formData.get("instructions")),
        priority: trimmedOrUndefined(formData.get("priority")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to assign the form." }
  }

  revalidateFormsPaths()
  redirect("/admin/forms/assigned")
}

export async function saveFormDraftResponses(
  instanceId: string,
  actingEmployeeId: string,
  responses: { formFieldId: string; value: unknown }[]
): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/instances/${instanceId}/responses`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, responses }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to save your responses." }
  }
  revalidateFormsPaths()
  return {}
}

export async function chooseFormSignatory(instanceId: string, signatureId: string, actingEmployeeId: string, signerId: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/instances/${instanceId}/signatures/${signatureId}/signatory`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, signerId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to select the signatory." }
  }
  revalidateFormsPaths()
  return {}
}

export async function submitFormInstance(instanceId: string, actingEmployeeId: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/instances/${instanceId}/submit`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit the form." }
  }
  revalidateFormsPaths()
  return {}
}

export async function archiveFormInstance(instanceId: string, actingEmployeeId: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/instances/${instanceId}/archive`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to archive the form." }
  }
  revalidateFormsPaths()
  return {}
}

/** Plain `<form action={...}>` elements require a `(formData) => void |
 *  Promise<void>` handler — archiveFormInstance returns `Promise<FormsActionState>`
 *  for callers that can surface the error, so this void-returning wrapper is
 *  what the bare archive button binds to instead. */
export async function archiveFormInstanceForm(instanceId: string, actingEmployeeId: string): Promise<void> {
  await archiveFormInstance(instanceId, actingEmployeeId)
}

// ---- Signatures -------------------------------------------------------------------

export async function signForm(signatureId: string, actingEmployeeId: string, comments?: string, ipAddress?: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/signatures/${signatureId}/sign`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, comments, ipAddress }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to sign the form." }
  }
  revalidateFormsPaths()
  return {}
}

export async function rejectForm(signatureId: string, actingEmployeeId: string, comments: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/signatures/${signatureId}/reject`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, comments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to reject the form." }
  }
  revalidateFormsPaths()
  return {}
}

export async function returnFormForCorrection(signatureId: string, actingEmployeeId: string, comments: string): Promise<FormsActionState> {
  try {
    await apiFetch(`/forms/signatures/${signatureId}/return`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, comments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to return the form for correction." }
  }
  revalidateFormsPaths()
  return {}
}
