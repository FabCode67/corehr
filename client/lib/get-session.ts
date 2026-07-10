import { cookies } from "next/headers"

import { decodeSession, SESSION_COOKIE } from "@/lib/session"

/**
 * Server-only helper for reading the current mock session from the
 * request cookies. Use in layouts/pages (Server Components) and Server
 * Actions only — never import this from a Client Component. (Consider
 * adding the `server-only` package once npm access is available, to get
 * a build-time guard against accidental client imports.)
 */
export async function getSession() {
  const cookieStore = await cookies()
  return decodeSession(cookieStore.get(SESSION_COOKIE)?.value)
}
