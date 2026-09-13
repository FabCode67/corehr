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

export async function createDepartment(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const functionId = String(formData.get("functionId") ?? "")
  const name = trimmedOrUndefined(formData.get("name"))

  if (!functionId || !name) {
    return { error: "Function and name are required." }
  }

  try {
    await apiFetch("/organization/departments", {
      method: "POST",
      body: JSON.stringify({
        functionId,
        name,
        code: trimmedOrUndefined(formData.get("code")),
        description: trimmedOrUndefined(formData.get("description")),
        parentDepartmentId: trimmedOrUndefined(formData.get("parentDepartmentId")),
        headOfDepartmentId: trimmedOrUndefined(formData.get("headOfDepartmentId")),
        actingHeadOfDepartmentId: trimmedOrUndefined(formData.get("actingHeadOfDepartmentId")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create department." }
  }

  revalidatePath("/admin/departments")
  redirect("/admin/departments")
}

export async function updateDepartment(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const functionId = String(formData.get("functionId") ?? "")
  const name = trimmedOrUndefined(formData.get("name"))

  if (!functionId || !name) {
    return { error: "Function and name are required." }
  }

  try {
    await apiFetch(`/organization/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        functionId,
        name,
        code: trimmedOrUndefined(formData.get("code")),
        description: trimmedOrUndefined(formData.get("description")),
        parentDepartmentId: trimmedOrUndefined(formData.get("parentDepartmentId")),
        // `?? null` (not just trimmedOrUndefined) on these two: an update PATCH
        // with an omitted key leaves the existing value untouched (see
        // DepartmentsService.update()'s `!== undefined` guards), so clearing
        // "None" back to empty in the Select has to send an explicit null,
        // not just drop the key. Matters most for Acting Head — "admin clears
        // it when the head is back" only works if this round-trips.
        headOfDepartmentId: trimmedOrUndefined(formData.get("headOfDepartmentId")) ?? null,
        actingHeadOfDepartmentId: trimmedOrUndefined(formData.get("actingHeadOfDepartmentId")) ?? null,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update department." }
  }

  revalidatePath("/admin/departments")
  revalidatePath(`/admin/departments/${id}`)
  redirect("/admin/departments")
}

export async function deactivateDepartment(id: string) {
  await apiFetch(`/organization/departments/${id}`, { method: "DELETE" })
  revalidatePath("/admin/departments")
}

export async function createUnit(
  departmentId: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const name = trimmedOrUndefined(formData.get("name"))

  if (!name) {
    return { error: "Unit name is required." }
  }

  try {
    await apiFetch("/organization/units", {
      method: "POST",
      body: JSON.stringify({
        departmentId,
        name,
        code: trimmedOrUndefined(formData.get("code")),
        description: trimmedOrUndefined(formData.get("description")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create unit." }
  }

  revalidatePath(`/admin/departments/${departmentId}`)
  return {}
}

export async function deactivateUnit(unitId: string, departmentId: string) {
  await apiFetch(`/organization/units/${unitId}`, { method: "DELETE" })
  revalidatePath(`/admin/departments/${departmentId}`)
}
