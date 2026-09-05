"use server"

import { revalidatePath } from "next/cache"

import { apiFetch, ApiError } from "@/lib/api/client"

// Staff-facing equivalents of admin/employees/actions.ts's Step 4 (Family
// Information) actions — same backend endpoints, but every call here is
// scoped to the logged-in employee's own record (the page always binds
// `id` to session.employeeId, never a value read from the request), and
// revalidatePath points at the staff route instead of the admin one. See
// employees.controller.ts's family-tree/family-members routes: there's no
// server-side "is this your own record" guard, so this scoping is what
// actually keeps a staff member from editing anyone else's family data.

export interface ActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

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

  revalidatePath("/staff/family")
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

  revalidatePath("/staff/family")
  return {}
}

export async function removeChild(id: string, childId: string) {
  await apiFetch(`/employees/${id}/children/${childId}`, { method: "DELETE" })
  revalidatePath("/staff/family")
}

export async function addFamilyMember(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  const relationship = trimmedOrUndefined(formData.get("relationship"))

  if (!name || !relationship) {
    return { error: "Name and relationship are required." }
  }

  try {
    await apiFetch(`/employees/${id}/family-members`, {
      method: "POST",
      body: JSON.stringify({
        name,
        relationship,
        gender: trimmedOrUndefined(formData.get("gender")),
        dateOfBirth: trimmedOrUndefined(formData.get("dateOfBirth")),
        occupation: trimmedOrUndefined(formData.get("occupation")),
        contactNumber: trimmedOrUndefined(formData.get("contactNumber")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add family member." }
  }

  revalidatePath("/staff/family")
  return {}
}

export async function removeFamilyMember(id: string, familyMemberId: string) {
  await apiFetch(`/employees/${id}/family-members/${familyMemberId}`, { method: "DELETE" })
  revalidatePath("/staff/family")
}
