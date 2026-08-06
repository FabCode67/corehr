"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { apiFetch, ApiError } from "./client"

export interface ErActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Every mutation below can affect the ER dashboard, case lists, grievance
 *  lists, and an employee's ER history — revalidate broadly rather than
 *  tracking exact paths (same reasoning as revalidateFormsPaths()). */
function revalidateErPaths() {
  revalidatePath("/admin/employee-relations")
  revalidatePath("/staff/employee-relations")
}

// ---- Sanction types ---------------------------------------------------------------

export async function createSanctionType(_prevState: ErActionState | undefined, formData: FormData): Promise<ErActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  if (!name) {
    return { error: "Name is required." }
  }
  try {
    await apiFetch("/employee-relations/sanction-types", {
      method: "POST",
      body: JSON.stringify({ name, description: trimmedOrUndefined(formData.get("description")) }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the sanction type." }
  }
  revalidateErPaths()
  return {}
}

export async function updateSanctionType(id: string, _prevState: ErActionState | undefined, formData: FormData): Promise<ErActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  if (!name) {
    return { error: "Name is required." }
  }
  try {
    await apiFetch(`/employee-relations/sanction-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description: trimmedOrUndefined(formData.get("description")) }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the sanction type." }
  }
  revalidateErPaths()
  return {}
}

export async function deleteSanctionType(id: string): Promise<ErActionState> {
  try {
    await apiFetch(`/employee-relations/sanction-types/${id}`, { method: "DELETE" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to remove the sanction type." }
  }
  revalidateErPaths()
  return {}
}

/** Plain `<form action={...}>` elements require a `(formData) => void |
 *  Promise<void>` handler — `deleteSanctionType` returns `Promise<ErActionState>`
 *  for callers that can surface the error, so this void-returning wrapper is
 *  what the bare delete button in the sanction types list binds to instead. */
export async function deleteSanctionTypeForm(id: string): Promise<void> {
  await deleteSanctionType(id)
}

// ---- Disciplinary cases -------------------------------------------------------------

export async function createDisciplinaryCase(_prevState: ErActionState | undefined, formData: FormData): Promise<ErActionState> {
  const employeeId = trimmedOrUndefined(formData.get("employeeId"))
  const reportedById = trimmedOrUndefined(formData.get("reportedById"))
  const incidentDate = trimmedOrUndefined(formData.get("incidentDate"))
  const category = trimmedOrUndefined(formData.get("category"))
  const subject = trimmedOrUndefined(formData.get("subject"))
  const description = trimmedOrUndefined(formData.get("description"))

  if (!employeeId || !reportedById || !incidentDate || !category || !subject || !description) {
    return { error: "Employee, reporter, incident date, category, subject, and description are required." }
  }

  let caseId: string
  try {
    const created = await apiFetch<{ id: string }>("/employee-relations/cases", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        reportedById,
        incidentDate,
        category,
        subject,
        description,
        incidentLocation: trimmedOrUndefined(formData.get("incidentLocation")),
        investigationRequired: formData.get("investigationRequired") === "on",
        isConfidential: formData.get("isConfidential") === "on",
        witnesses: trimmedOrUndefined(formData.get("witnesses"))
          ?.split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    })
    caseId = created.id
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the disciplinary case." }
  }

  revalidateErPaths()
  redirect(`/admin/employee-relations/cases/${caseId}`)
}

export async function updateDisciplinaryCase(id: string, actingEmployeeId: string, _prevState: ErActionState | undefined, formData: FormData): Promise<ErActionState> {
  const subject = trimmedOrUndefined(formData.get("subject"))
  const description = trimmedOrUndefined(formData.get("description"))
  if (!subject || !description) {
    return { error: "Subject and description are required." }
  }
  try {
    await apiFetch(`/employee-relations/cases/${id}?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        subject,
        description,
        incidentLocation: trimmedOrUndefined(formData.get("incidentLocation")),
        category: trimmedOrUndefined(formData.get("category")),
        investigationRequired: formData.get("investigationRequired") === "on",
        isConfidential: formData.get("isConfidential") === "on",
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the case." }
  }
  revalidateErPaths()
  return {}
}

export async function submitDisciplinaryCase(id: string, actingEmployeeId: string): Promise<ErActionState> {
  try {
    await apiFetch(`/employee-relations/cases/${id}/submit`, { method: "POST", body: JSON.stringify({ actingEmployeeId }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit the case." }
  }
  revalidateErPaths()
  return {}
}

export async function closeDisciplinaryCase(id: string, actingEmployeeId: string, comments?: string): Promise<ErActionState> {
  try {
    await apiFetch(`/employee-relations/cases/${id}/close`, { method: "POST", body: JSON.stringify({ actingEmployeeId, comments }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to close the case." }
  }
  revalidateErPaths()
  return {}
}

export async function scheduleDisciplinaryMeeting(
  caseId: string,
  _prevState: ErActionState | undefined,
  formData: FormData
): Promise<ErActionState> {
  const scheduledAt = trimmedOrUndefined(formData.get("scheduledAt"))
  const createdById = trimmedOrUndefined(formData.get("createdById"))
  if (!scheduledAt || !createdById) {
    return { error: "A date/time and the scheduler are required." }
  }
  const inviteeIds = formData.getAll("inviteeIds").map(String).filter(Boolean)
  try {
    await apiFetch(`/employee-relations/cases/${caseId}/meetings`, {
      method: "POST",
      body: JSON.stringify({
        subject: trimmedOrUndefined(formData.get("subject")),
        scheduledAt,
        createdById,
        location: trimmedOrUndefined(formData.get("location")),
        notes: trimmedOrUndefined(formData.get("notes")),
        inviteeIds: inviteeIds.length > 0 ? inviteeIds : undefined,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to schedule the meeting." }
  }
  revalidateErPaths()
  return {}
}

// ---- Investigations -----------------------------------------------------------------

export async function openInvestigation(caseId: string, _prevState: ErActionState | undefined, formData: FormData): Promise<ErActionState> {
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const investigatorId = trimmedOrUndefined(formData.get("investigatorId"))
  const startDate = trimmedOrUndefined(formData.get("startDate"))
  if (!actingEmployeeId || !investigatorId || !startDate) {
    return { error: "Investigator and start date are required." }
  }
  try {
    await apiFetch(`/employee-relations/cases/${caseId}/investigations`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, investigatorId, startDate, dueDate: trimmedOrUndefined(formData.get("dueDate")) }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to open the investigation." }
  }
  revalidateErPaths()
  return {}
}

export async function completeInvestigation(
  caseId: string,
  investigationId: string,
  _prevState: ErActionState | undefined,
  formData: FormData
): Promise<ErActionState> {
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const findings = trimmedOrUndefined(formData.get("findings"))
  const recommendation = trimmedOrUndefined(formData.get("recommendation"))
  if (!actingEmployeeId || !findings || !recommendation) {
    return { error: "Findings and a recommendation are required to complete an investigation." }
  }
  try {
    await apiFetch(`/employee-relations/cases/${caseId}/investigations/${investigationId}/complete`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, findings, recommendation, summary: trimmedOrUndefined(formData.get("summary")) }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to complete the investigation." }
  }
  revalidateErPaths()
  return {}
}

// ---- Sanctions ------------------------------------------------------------------------

export async function issueSanction(caseId: string, _prevState: ErActionState | undefined, formData: FormData): Promise<ErActionState> {
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const sanctionTypeId = trimmedOrUndefined(formData.get("sanctionTypeId"))
  const reason = trimmedOrUndefined(formData.get("reason"))
  const effectiveDate = trimmedOrUndefined(formData.get("effectiveDate"))
  const issuedById = trimmedOrUndefined(formData.get("issuedById"))

  if (!actingEmployeeId || !sanctionTypeId || !reason || !effectiveDate || !issuedById) {
    return { error: "Sanction type, reason, effective date, and issuer are required." }
  }

  try {
    await apiFetch(`/employee-relations/cases/${caseId}/sanctions`, {
      method: "POST",
      body: JSON.stringify({
        actingEmployeeId,
        sanctionTypeId,
        reason,
        effectiveDate,
        issuedById,
        approvalAuthorityId: trimmedOrUndefined(formData.get("approvalAuthorityId")),
        comments: trimmedOrUndefined(formData.get("comments")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to issue the sanction." }
  }
  revalidateErPaths()
  return {}
}

// ---- Grievances -----------------------------------------------------------------------

export async function submitGrievance(_prevState: ErActionState | undefined, formData: FormData): Promise<ErActionState> {
  const employeeId = trimmedOrUndefined(formData.get("employeeId"))
  const subject = trimmedOrUndefined(formData.get("subject"))
  const description = trimmedOrUndefined(formData.get("description"))
  const category = trimmedOrUndefined(formData.get("category"))

  if (!employeeId || !subject || !description || !category) {
    return { error: "Subject, description, and category are required." }
  }

  try {
    await apiFetch("/employee-relations/grievances", {
      method: "POST",
      body: JSON.stringify({ employeeId, subject, description, category }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit the grievance." }
  }

  revalidateErPaths()
  redirect("/staff/employee-relations/grievances")
}

export async function updateGrievanceStatus(id: string, actingEmployeeId: string, status: string, resolutionComments?: string): Promise<ErActionState> {
  try {
    await apiFetch(`/employee-relations/grievances/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, status, resolutionComments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update the grievance." }
  }
  revalidateErPaths()
  return {}
}

export async function assignGrievance(id: string, actingEmployeeId: string, assignedToId: string): Promise<ErActionState> {
  try {
    await apiFetch(`/employee-relations/grievances/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, assignedToId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to assign the grievance." }
  }
  revalidateErPaths()
  return {}
}

// ---- Appeals --------------------------------------------------------------------------

export async function submitAppeal(caseId: string, _prevState: ErActionState | undefined, formData: FormData): Promise<ErActionState> {
  const actingEmployeeId = trimmedOrUndefined(formData.get("actingEmployeeId"))
  const appealReason = trimmedOrUndefined(formData.get("appealReason"))
  if (!actingEmployeeId || !appealReason) {
    return { error: "A reason for the appeal is required." }
  }
  try {
    await apiFetch(`/employee-relations/cases/${caseId}/appeals`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, appealReason }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit the appeal." }
  }
  revalidateErPaths()
  return {}
}

export async function decideAppeal(
  caseId: string,
  appealId: string,
  actingEmployeeId: string,
  outcome: string,
  decisionComments: string
): Promise<ErActionState> {
  try {
    await apiFetch(`/employee-relations/cases/${caseId}/appeals/${appealId}/decide`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, outcome, decisionComments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to decide the appeal." }
  }
  revalidateErPaths()
  return {}
}
