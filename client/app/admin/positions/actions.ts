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

export async function createPosition(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const title = trimmedOrUndefined(formData.get("title"))
  const departmentId = String(formData.get("departmentId") ?? "")
  const levelId = String(formData.get("levelId") ?? "")

  if (!title || !departmentId || !levelId) {
    return { error: "Title, department, and level are required." }
  }

  try {
    await apiFetch("/organization/positions", {
      method: "POST",
      body: JSON.stringify({
        title,
        departmentId,
        levelId,
        unitId: trimmedOrUndefined(formData.get("unitId")),
        reportsToPositionId: trimmedOrUndefined(formData.get("reportsToPositionId")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create position." }
  }

  revalidatePath("/admin/positions")
  revalidatePath("/admin/organization")
  redirect("/admin/positions")
}

export async function updatePosition(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const title = trimmedOrUndefined(formData.get("title"))
  const departmentId = String(formData.get("departmentId") ?? "")
  const levelId = String(formData.get("levelId") ?? "")

  if (!title || !departmentId || !levelId) {
    return { error: "Title, department, and level are required." }
  }

  try {
    await apiFetch(`/organization/positions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        departmentId,
        levelId,
        // Explicit null (not omitted) so the API can tell "clear the
        // unit" apart from "field wasn't sent" — see UpdatePositionDto /
        // PositionsService.update in the backend.
        unitId: trimmedOrUndefined(formData.get("unitId")) ?? null,
        reportsToPositionId: trimmedOrUndefined(formData.get("reportsToPositionId")) ?? null,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update position." }
  }

  revalidatePath("/admin/positions")
  revalidatePath(`/admin/positions/${id}`)
  revalidatePath("/admin/organization")
  redirect("/admin/positions")
}

export async function deactivatePosition(id: string) {
  await apiFetch(`/organization/positions/${id}`, { method: "DELETE" })
  revalidatePath("/admin/positions")
  revalidatePath("/admin/organization")
}
