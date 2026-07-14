"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { apiFetch, ApiError } from "@/lib/api/client"

export interface ActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function basicInfoPayload(formData: FormData) {
  return {
    firstName: trimmedOrUndefined(formData.get("firstName")),
    middleName: trimmedOrUndefined(formData.get("middleName")),
    lastName: trimmedOrUndefined(formData.get("lastName")),
    preferredName: trimmedOrUndefined(formData.get("preferredName")),
    gender: trimmedOrUndefined(formData.get("gender")),
    dateOfBirth: trimmedOrUndefined(formData.get("dateOfBirth")),
    nationalIdNumber: trimmedOrUndefined(formData.get("nationalIdNumber")),
    nationality: trimmedOrUndefined(formData.get("nationality")),
    maritalStatus: trimmedOrUndefined(formData.get("maritalStatus")),
    email: trimmedOrUndefined(formData.get("email")),
    phone: trimmedOrUndefined(formData.get("phone")),
    workLocation: trimmedOrUndefined(formData.get("workLocation")),
    profilePictureUrl: trimmedOrUndefined(formData.get("profilePictureUrl")),
  }
}

const REQUIRED_BASIC_FIELDS = [
  "firstName",
  "lastName",
  "gender",
  "dateOfBirth",
  "nationalIdNumber",
  "nationality",
  "maritalStatus",
  "email",
  "phone",
  "workLocation",
] as const

// ---- Step 1: Basic Information --------------------------------------------

export async function createEmployee(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const payload = basicInfoPayload(formData)

  const missing = REQUIRED_BASIC_FIELDS.some((field) => !payload[field])
  if (missing) {
    return { error: "Please fill in every required Basic Information field." }
  }

  let employeeId: string
  try {
    const employee = await apiFetch<{ id: string }>("/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    employeeId = employee.id
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create employee." }
  }

  revalidatePath("/admin/employees")
  redirect(`/admin/employees/${employeeId}`)
}

export async function updateBasicInfo(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const payload = basicInfoPayload(formData)

  const missing = REQUIRED_BASIC_FIELDS.some((field) => !payload[field])
  if (missing) {
    return { error: "Please fill in every required Basic Information field." }
  }

  try {
    await apiFetch(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update employee." }
  }

  revalidatePath("/admin/employees")
  revalidatePath(`/admin/employees/${id}`)
  return {}
}

// ---- Step 2: Employment Details --------------------------------------------

export async function updateEmploymentDetails(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const previousEmployee = formData.get("previousEmployee") === "on"

  if (
    previousEmployee &&
    (!trimmedOrUndefined(formData.get("previousEmployeeNumber")) ||
      !trimmedOrUndefined(formData.get("previousPositionHeld")) ||
      !trimmedOrUndefined(formData.get("previousDepartment")) ||
      !trimmedOrUndefined(formData.get("previousExitDate")) ||
      !trimmedOrUndefined(formData.get("previousReasonForLeaving")))
  ) {
    return { error: "Please fill in all previous-employment fields, or turn that toggle off." }
  }

  try {
    await apiFetch(`/employees/${id}/employment-details`, {
      method: "PATCH",
      body: JSON.stringify({
        contractType: trimmedOrUndefined(formData.get("contractType")),
        employmentStartDate: trimmedOrUndefined(formData.get("employmentStartDate")),
        probationEndDate: trimmedOrUndefined(formData.get("probationEndDate")),
        contractEndDate: trimmedOrUndefined(formData.get("contractEndDate")),
        previousEmployee,
        previousEmployeeNumber: previousEmployee
          ? trimmedOrUndefined(formData.get("previousEmployeeNumber"))
          : undefined,
        previousPositionHeld: previousEmployee
          ? trimmedOrUndefined(formData.get("previousPositionHeld"))
          : undefined,
        previousDepartment: previousEmployee
          ? trimmedOrUndefined(formData.get("previousDepartment"))
          : undefined,
        previousExitDate: previousEmployee
          ? trimmedOrUndefined(formData.get("previousExitDate"))
          : undefined,
        previousReasonForLeaving: previousEmployee
          ? trimmedOrUndefined(formData.get("previousReasonForLeaving"))
          : undefined,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to save employment details." }
  }

  revalidatePath(`/admin/employees/${id}`)
  return {}
}

// ---- Step 3: Position Assignment -------------------------------------------

export async function assignPosition(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const positionId = String(formData.get("positionId") ?? "")
  const bandId = String(formData.get("bandId") ?? "")
  const effectiveFrom = trimmedOrUndefined(formData.get("effectiveFrom"))

  if (!positionId || !bandId || !effectiveFrom) {
    return { error: "Position, band, and effective date are required." }
  }

  try {
    await apiFetch(`/employees/${id}/position-assignment`, {
      method: "POST",
      body: JSON.stringify({ positionId, bandId, effectiveFrom }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to assign position." }
  }

  revalidatePath("/admin/employees")
  revalidatePath(`/admin/employees/${id}`)
  revalidatePath("/admin/organization")
  return {}
}

export async function transferEmployee(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const positionId = String(formData.get("positionId") ?? "")
  const changeType = String(formData.get("changeType") ?? "")
  const effectiveFrom = trimmedOrUndefined(formData.get("effectiveFrom"))

  if (!positionId || !changeType || !effectiveFrom) {
    return { error: "Position, change type, and effective date are required." }
  }

  try {
    await apiFetch(`/employees/${id}/transfer`, {
      method: "POST",
      body: JSON.stringify({
        positionId,
        changeType,
        effectiveFrom,
        changeReason: trimmedOrUndefined(formData.get("changeReason")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to transfer employee." }
  }

  revalidatePath("/admin/employees")
  revalidatePath(`/admin/employees/${id}`)
  revalidatePath("/admin/organization")
  return {}
}

export async function changeEmployeeBand(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const bandId = String(formData.get("bandId") ?? "")
  const effectiveFrom = trimmedOrUndefined(formData.get("effectiveFrom"))

  if (!bandId || !effectiveFrom) {
    return { error: "Band and effective date are required." }
  }

  try {
    await apiFetch(`/employees/${id}/band`, {
      method: "POST",
      body: JSON.stringify({
        bandId,
        effectiveFrom,
        changeReason: trimmedOrUndefined(formData.get("changeReason")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to change band." }
  }

  revalidatePath("/admin/employees")
  revalidatePath(`/admin/employees/${id}`)
  return {}
}

// ---- Step 4: Family Information --------------------------------------------

export async function updatePartner(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await apiFetch(`/employees/${id}/partner`, {
      method: "PUT",
      body: JSON.stringify({
        partnerName: trimmedOrUndefined(formData.get("partnerName")),
        partnerPhone: trimmedOrUndefined(formData.get("partnerPhone")),
        partnerDateOfBirth: trimmedOrUndefined(formData.get("partnerDateOfBirth")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to save partner details." }
  }

  revalidatePath(`/admin/employees/${id}`)
  return {}
}

export async function addChild(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const fullName = trimmedOrUndefined(formData.get("fullName"))
  const dateOfBirth = trimmedOrUndefined(formData.get("dateOfBirth"))
  const gender = trimmedOrUndefined(formData.get("gender"))

  if (!fullName || !dateOfBirth || !gender) {
    return { error: "Child's name, date of birth, and gender are required." }
  }

  try {
    await apiFetch(`/employees/${id}/children`, {
      method: "POST",
      body: JSON.stringify({ fullName, dateOfBirth, gender }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add child." }
  }

  revalidatePath(`/admin/employees/${id}`)
  return {}
}

export async function removeChild(id: string, childId: string) {
  await apiFetch(`/employees/${id}/children/${childId}`, { method: "DELETE" })
  revalidatePath(`/admin/employees/${id}`)
}

// ---- Step 5: Education & Professional Development ---------------------------

export async function addEducation(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const type = trimmedOrUndefined(formData.get("type"))
  const title = trimmedOrUndefined(formData.get("title"))
  const institution = trimmedOrUndefined(formData.get("institution"))
  const startDate = trimmedOrUndefined(formData.get("startDate"))

  if (!type || !title || !institution || !startDate) {
    return { error: "Type, title, institution, and start date are required." }
  }

  try {
    await apiFetch(`/employees/${id}/education`, {
      method: "POST",
      body: JSON.stringify({
        type,
        title,
        institution,
        startDate,
        fieldOfStudy: trimmedOrUndefined(formData.get("fieldOfStudy")),
        grade: trimmedOrUndefined(formData.get("grade")),
        endDate: trimmedOrUndefined(formData.get("endDate")),
        certificateUrl: trimmedOrUndefined(formData.get("certificateUrl")),
        description: trimmedOrUndefined(formData.get("description")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add education record." }
  }

  revalidatePath(`/admin/employees/${id}`)
  return {}
}

export async function removeEducation(id: string, educationId: string) {
  await apiFetch(`/employees/${id}/education/${educationId}`, { method: "DELETE" })
  revalidatePath(`/admin/employees/${id}`)
}

// ---- Exit Management ----------------------------------------------------------

export async function processExit(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const exitDate = trimmedOrUndefined(formData.get("exitDate"))
  const exitReason = trimmedOrUndefined(formData.get("exitReason"))
  const exitType = trimmedOrUndefined(formData.get("exitType"))

  if (!exitDate || !exitReason || !exitType) {
    return { error: "Exit date, reason for exit, and type of exit are required." }
  }

  try {
    await apiFetch(`/employees/${id}/exit`, {
      method: "POST",
      body: JSON.stringify({
        exitDate,
        exitReason,
        exitType,
        nextMove: trimmedOrUndefined(formData.get("nextMove")),
        comments: trimmedOrUndefined(formData.get("comments")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to process exit." }
  }

  revalidatePath("/admin/employees")
  revalidatePath(`/admin/employees/${id}`)
  revalidatePath("/admin/organization")
  return {}
}

// ---- Status (legacy quick deactivate — Exit Management above is preferred) ----

export async function deactivateEmployee(id: string) {
  await apiFetch(`/employees/${id}`, { method: "DELETE" })
  revalidatePath("/admin/employees")
  revalidatePath("/admin/organization")
  revalidatePath(`/admin/employees/${id}`)
}
