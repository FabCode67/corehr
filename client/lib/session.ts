/**
 * Session handling for NCBA Rwanda PeopleSuite.
 *
 * Credentials are real (checked against Employee.passwordHash via
 * POST /auth/login, see app/login/actions.ts and lib/api/auth.ts), but the
 * session itself is still a lightweight, unsigned cookie — the encoded JSON
 * below is base64, NOT signed or encrypted. Fine for this app's current
 * trust model (a single internal API, no untrusted clients), but do not
 * treat it as tamper-proof.
 *
 * Swap-out plan: if this ever needs to resist a malicious client, replace
 * `encodeSession`/`decodeSession` with real JWT sign/verify and this file's
 * public API (SESSION_COOKIE, SessionUser, decodeSession) can stay the
 * same, so middleware.ts and the portal layouts won't need to change.
 */

export type Role = "staff" | "admin"

export interface SessionUser {
  /** Always the underlying Employee's id — every login is a real employee
   *  now, there's no separate "user id" concept. */
  id: string
  name: string
  email: string
  role: Role
  jobTitle: string
  department: string
  branch: string
  /** Same value as `id`, kept as its own field since Leave pages and other
   *  employee-scoped features read `session.employeeId` specifically. */
  employeeId: string
}

export const SESSION_COOKIE = "ps_session"

export function encodeSession(user: SessionUser): string {
  return btoa(encodeURIComponent(JSON.stringify(user)))
}

export function decodeSession(value: string | undefined | null): SessionUser | null {
  if (!value) return null

  try {
    const json = decodeURIComponent(atob(value))
    const parsed = JSON.parse(json)

    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.employeeId === "string" &&
      (parsed.role === "staff" || parsed.role === "admin")
    ) {
      return parsed as SessionUser
    }

    return null
  } catch {
    return null
  }
}
