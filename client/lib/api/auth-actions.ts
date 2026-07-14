"use server"

import { changePasswordRequest } from "./auth"
import { ApiError } from "./client"

export interface ChangePasswordState {
  error?: string
  success?: boolean
}

export async function changePassword(
  employeeId: string,
  _prevState: ChangePasswordState | undefined,
  formData: FormData
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "")
  const newPassword = String(formData.get("newPassword") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!currentPassword || !newPassword) {
    return { error: "Current and new password are required." }
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." }
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation don't match." }
  }

  try {
    await changePasswordRequest(employeeId, currentPassword, newPassword)
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to change password." }
  }

  return { success: true }
}
