"use server"

import { forgotPasswordRequest } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"

export interface ForgotPasswordState {
  error?: string
  sent?: boolean
}

export async function requestPasswordReset(_prev: ForgotPasswordState | undefined, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!email) return { error: "Enter your work email." }
  try {
    await forgotPasswordRequest(email)
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Could not reach the server. Please try again." }
  }
  return { sent: true }
}
