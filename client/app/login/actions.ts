"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { loginRequest } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { decodeSession, SESSION_COOKIE } from "@/lib/session"

export interface LoginState {
  error?: string
}

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  let accessToken: string
  try {
    ;({ accessToken } = await loginRequest(email, password))
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Could not reach the server. Please try again.",
    }
  }

  // The cookie IS the token the API just signed — see lib/session.ts's doc
  // comment. Verify it here (rather than trusting it blindly) so a
  // misconfigured JWT_SECRET between the two apps fails loudly at login
  // instead of silently producing sessions middleware.ts can never decode.
  const sessionUser = await decodeSession(accessToken)
  if (!sessionUser) {
    return { error: "Could not establish a session. Please contact support if this keeps happening." }
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours — matches the token's own expiry (see server/src/modules/auth/jwt.constants.ts)
  })

  // First Login Security: a temporary password sends the employee straight
  // to the forced change-password/terms page instead of their portal.
  redirect(sessionUser.mustChangePassword ? "/change-password" : sessionUser.role === "admin" ? "/admin" : "/staff")
}

export async function logout() {
  "use server"

  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
