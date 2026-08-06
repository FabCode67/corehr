"use server"

import { revalidatePath } from "next/cache"

import { apiFetch, ApiError } from "@/lib/api/client"

export interface ActionState {
  error?: string
}

/** Settings > Admin Access. Grants/revokes Employee.isAdmin — the server
 *  enforces the "can't remove the last admin" and "can't grant admin to an
 *  inactive employee" guardrails (see EmployeesService.setAdminAccess()),
 *  this action just surfaces whatever it returns as form-friendly state. */
export async function setAdminAccess(
  id: string,
  isAdmin: boolean,
  _prevState: ActionState | undefined,
  _formData: FormData
): Promise<ActionState> {
  try {
    await apiFetch(`/employees/${id}/admin-access`, {
      method: "PATCH",
      body: JSON.stringify({ isAdmin }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update admin access." }
  }

  revalidatePath("/admin/settings")
  revalidatePath(`/admin/employees/${id}`)
  return {}
}
