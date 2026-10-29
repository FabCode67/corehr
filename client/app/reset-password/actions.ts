"use server"

import { resetPasswordRequest } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"

export interface ResetPasswordState {
  error?: string
  done?: boolean
}

export async function resetPassword(_prev: ResetPasswordState | undefined, formData: FormData): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "")
  const newPassword = String(formData.get("newPassword") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!token) return { error: "This reset link is invalid. Please request a new one." }
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." }
  if (newPassword !== confirmPassword) return { error: "New password and confirmation don't match." }

  try {
    await resetPasswordRequest(token, newPassword)
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Could not reset your password. Please try again." }
  }
  return { done: true }
}
