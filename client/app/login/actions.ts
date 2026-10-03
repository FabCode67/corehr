"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { loginRequest } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { decodeSession, SESSION_COOKIE } from "@/lib/session"

export interface LoginState {
  error?: string
  /** Set on success instead of calling redirect() directly here — see the
   *  comment above the final return below for why. */
  redirectTo?: string
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

  // Deliberately NOT calling redirect() here. redirect() from a Server
  // Action resolves the destination server-side in the same turnaround as
  // this response — including rerunning middleware.ts — and middleware
  // doesn't reliably see the Set-Cookie above yet (it's only guaranteed to
  // reach the browser, not to be visible to that internal re-resolution on
  // Vercel). That race bounces straight back to /login?next=..., which is
  // the "stuck on login after a 303" bug this fixes. Returning the target
  // instead and letting the client navigate (see login/page.tsx) means the
  // cookie has actually landed in the browser before /staff or /admin is
  // ever requested, so middleware sees it like any other request.
  //
  // First Login Security: a temporary password sends the employee straight
  // to the forced change-password/terms page instead of their portal.
  return {
    redirectTo: sessionUser.mustChangePassword
      ? "/change-password"
      : sessionUser.role === "admin"
        ? "/admin"
        : "/staff",
  }
}

export async function logout() {
  "use server"

  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
