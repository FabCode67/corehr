/**
 * Session handling for NCBA Rwanda PeopleSuite.
 *
 * IMPORTANT: This is a MOCK auth layer for scaffolding the three portals
 * (landing, staff, admin) before the real NestJS + PostgreSQL backend
 * exists. The cookie below is base64-encoded JSON — NOT signed or
 * encrypted. Do not treat it as secure.
 *
 * Swap-out plan: once the NestJS auth service issues real JWTs, replace
 * `encodeSession`/`decodeSession` with JWT sign/verify calls and this
 * file's public API (SESSION_COOKIE, SessionUser, decodeSession) can stay
 * the same, so middleware.ts and the portal layouts won't need to change.
 */

export type Role = "staff" | "admin"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  jobTitle: string
  department: string
  branch: string
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
      (parsed.role === "staff" || parsed.role === "admin")
    ) {
      return parsed as SessionUser
    }

    return null
  } catch {
    return null
  }
}
