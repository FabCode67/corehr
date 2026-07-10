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

export async function createEmployee(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const employeeNumber = trimmedOrUndefined(formData.get("employeeNumber"))
  const firstName = trimmedOrUndefined(formData.get("firstName"))
  const lastName = trimmedOrUndefined(formData.get("lastName"))
  const email = trimmedOrUndefined(formData.get("email"))
  const positionId = String(formData.get("positionId") ?? "")
  const bandId = String(formData.get("bandId") ?? "")
  const hireDate = trimmedOrUndefined(formData.get("hireDate"))

  if (!employeeNumber || !firstName || !lastName || !email || !positionId || !bandId || !hireDate) {
    return { error: "All fields except employee number formatting are required." }
  }

  try {
    await apiFetch("/employees", {
      method: "POST",
      body: JSON.stringify({
        employeeNumber,
        firstName,
        lastName,
        email,
        positionId,
        bandId,
        hireDate,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create employee." }
  }

  revalidatePath("/admin/employees")
  revalidatePath("/admin/organization")
  redirect("/admin/employees")
}

export async function updateEmployee(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const firstName = trimmedOrUndefined(formData.get("firstName"))
  const lastName = trimmedOrUndefined(formData.get("lastName"))
  const email = trimmedOrUndefined(formData.get("email"))

  if (!firstName || !lastName || !email) {
    return { error: "First name, last name, and email are required." }
  }

  try {
    await apiFetch(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ firstName, lastName, email }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update employee." }
  }

  revalidatePath("/admin/employees")
  revalidatePath(`/admin/employees/${id}`)
  redirect(`/admin/employees/${id}`)
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

export async function deactivateEmployee(id: string) {
  await apiFetch(`/employees/${id}`, { method: "DELETE" })
  revalidatePath("/admin/employees")
  revalidatePath("/admin/organization")
}
