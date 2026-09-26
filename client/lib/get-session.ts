import { cookies } from "next/headers"

import { decodeSession, SESSION_COOKIE } from "@/lib/session"

/**
 * Server-only helper for reading the current session from the request
 * cookies — verifies the JWT's signature and expiry (see lib/session.ts),
 * so a tampered or expired cookie decodes to null here, not a forged
 * session. Use in layouts/pages (Server Components) and Server Actions
 * only — never import this from a Client Component. (Consider adding the
 * `server-only` package once npm access is available, to get a build-time
 * guard against accidental client imports.)
 */
export async function getSession() {
  const cookieStore = await cookies()
  return decodeSession(cookieStore.get(SESSION_COOKIE)?.value)
}
