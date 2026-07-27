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

export async function createBranch(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const name = trimmedOrUndefined(formData.get("name"))

  if (!name) {
    return { error: "Branch name is required." }
  }

  try {
    await apiFetch("/branches", {
      method: "POST",
      body: JSON.stringify({
        name,
        code: trimmedOrUndefined(formData.get("code")),
        isHeadquarters: formData.get("isHeadquarters") === "on",
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create branch." }
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
    return { error: "Branch name is required." }
  }

  try {
    await apiFetch(`/branches/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        code: trimmedOrUndefined(formData.get("code")),
        isHeadquarters: formData.get("isHeadquarters") === "on",
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update branch." }
  }

  revalidatePath("/admin/branches")
  revalidatePath(`/admin/branches/${id}`)
  redirect("/admin/branches")
}

export async function deactivateBranch(id: string) {
  await apiFetch(`/branches/${id}`, { method: "DELETE" })
  revalidatePath("/admin/branches")
}
