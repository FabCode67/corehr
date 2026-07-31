"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { acceptTermsRequest, changePasswordRequest } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { decodeSession, encodeSession, SESSION_COOKIE } from "@/lib/session"

export interface CompleteFirstLoginState {
  error?: string
}

/**
 * First Login Security's single combined action: change the temporary
 * password AND record Terms of Use acceptance in one submit, then reissue
 * the session cookie with mustChangePassword cleared so middleware.ts lets
 * the employee through to their portal. Both calls target the same
 * employeeId derived from the session cookie itself, not a hidden form
 * field — never trust the client for whose account this is.
 */
export async function completeFirstLogin(
  _prevState: CompleteFirstLoginState | undefined,
  formData: FormData
): Promise<CompleteFirstLoginState> {
  const cookieStore = await cookies()
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) {
    redirect("/login")
  }

  const currentPassword = String(formData.get("currentPassword") ?? "")
  const newPassword = String(formData.get("newPassword") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")
  const termsAccepted = formData.get("termsAccepted") === "on"

  if (!currentPassword || !newPassword) {
    return { error: "Current and new password are required." }
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." }
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation don't match." }
  }
  if (!termsAccepted) {
    return { error: "You must accept the Terms of Use to continue." }
  }

  try {
    await changePasswordRequest(session.employeeId, currentPassword, newPassword)
    await acceptTermsRequest(session.employeeId)
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to complete setup. Please try again." }
  }

  cookieStore.set(SESSION_COOKIE, encodeSession({ ...session, mustChangePassword: false }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  })

  redirect(session.role === "admin" ? "/admin" : "/staff")
}
