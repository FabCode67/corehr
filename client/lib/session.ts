import { jwtVerify } from "jose"

/**
 * Session handling for NCBA Rwanda PeopleSuite.
 *
 * The cookie IS the JWT the NestJS API signs at POST /auth/login (see
 * server/src/modules/auth/auth.service.ts) — not a separately re-encoded
 * value. This file just verifies that same token (using the identical
 * `JWT_SECRET` the server signs with — MUST be set to the same value in
 * both apps' environments) and forwards it as the `Authorization: Bearer`
 * header on every API call (see lib/api/client.ts), which is what actually
 * closes the "every endpoint trusted the caller with zero server-side
 * check" gap this app used to have. Previously this cookie was just
 * unsigned base64 — anyone could edit it in devtools and grant themselves
 * admin. It can't be forged anymore: `jwtVerify` rejects any tampered
 * payload or expired token outright.
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
  /** First Login Security (Email Notification & Automation module) — true
   *  for every newly created employee until they successfully change their
   *  temporary password. middleware.ts redirects anywhere in /staff or
   *  /admin to /change-password while this is true. */
  mustChangePassword: boolean
}

export const SESSION_COOKIE = "ps_session"

const JWT_SECRET = (() => {
  const fromEnv = process.env.JWT_SECRET
  if (fromEnv) return new TextEncoder().encode(fromEnv)
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production — refusing to start with the insecure dev default.")
  }
  return new TextEncoder().encode("dev-only-insecure-secret-do-not-use-in-production")
})()

function isSessionUserShape(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.employeeId === "string" &&
    (candidate.role === "staff" || candidate.role === "admin")
  )
}

/** Verifies the session token's signature and expiry, returning the
 *  claims as a SessionUser — or null if the cookie is missing, expired, or
 *  has been tampered with. Async (unlike the old synchronous base64
 *  decode) since real signature verification requires it; both call sites
 *  (middleware.ts, get-session.ts) already await it. */
export async function decodeSession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!isSessionUserShape(payload)) return null
    return { ...payload, mustChangePassword: Boolean(payload.mustChangePassword) } as SessionUser
  } catch {
    return null
  }
}
