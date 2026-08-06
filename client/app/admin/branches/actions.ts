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

function numberOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  if (trimmed.length === 0) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function createBranch(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const name = trimmedOrUndefined(formData.get("name"))

  if (!name) {
    return { error: "Location name is required." }
  }

  try {
    await apiFetch("/branches", {
      method: "POST",
      body: JSON.stringify({
        name,
        code: trimmedOrUndefined(formData.get("code")),
        isHeadquarters: formData.get("isHeadquarters") === "on",
        latitude: numberOrUndefined(formData.get("latitude")),
        longitude: numberOrUndefined(formData.get("longitude")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create location." }
  }

  revalidatePath("/admin/branches")
  redirect("/admin/branches")
}

export async function updateBranch(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const name = trimmedOrUndefined(formData.get("name"))

  if (!name) {
    return { error: "Location name is required." }
  }

  try {
    await apiFetch(`/branches/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        code: trimmedOrUndefined(formData.get("code")),
        isHeadquarters: formData.get("isHeadquarters") === "on",
        latitude: numberOrUndefined(formData.get("latitude")),
        longitude: numberOrUndefined(formData.get("longitude")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update location." }
  }

  revalidatePath("/admin/branches")
  revalidatePath(`/admin/branches/${id}`)
  redirect("/admin/branches")
}

export async function deactivateBranch(id: string) {
  await apiFetch(`/branches/${id}`, { method: "DELETE" })
  revalidatePath("/admin/branches")
}

export async function activateBranch(id: string) {
  await apiFetch(`/branches/${id}/activate`, { method: "PATCH" })
  revalidatePath("/admin/branches")
}
