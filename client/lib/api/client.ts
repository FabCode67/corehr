/**
 * Shared fetch helper for talking to the NestJS API from Server Components
 * and Server Actions. Two entry points:
 *
 * - `apiFetch` throws `ApiError` — use inside Server Actions, where the
 *   caller wraps the call in try/catch and turns it into a form-friendly
 *   `{ error }` state (see e.g. app/admin/departments/actions.ts).
 * - `apiFetchSafe` never throws — use inside Server Components rendering a
 *   page, so an unreachable API produces a friendly empty/error state
 *   instead of crashing the page (same pattern as lib/org-chart.ts).
 *
 * Both attach the current session cookie as `Authorization: Bearer` on
 * every call — the NestJS API now requires it (see JwtAuthGuard) on every
 * route except login. Reads the raw cookie value directly (not through
 * lib/session.ts's decodeSession(), which is async and does full signature
 * verification) since forwarding it is all that's needed here; the API
 * verifies it itself and rejects anything invalid/expired.
 */

import { cookies } from "next/headers"

import { SESSION_COOKIE } from "../session"

const API_BASE_URL = process.env.API_URL ?? "http://localhost:4000/api"

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** Exported for the app/api/**\/route.ts proxy handlers (see their own doc
 *  comments) — they make their own raw `fetch()` calls straight to the
 *  NestJS API rather than going through apiFetch/apiFetchSafe (mostly so
 *  they can stream back a binary file response), but need this same
 *  Authorization header or the now-global JwtAuthGuard rejects them too. */
export async function authHeader(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(await authHeader()), ...init?.headers },
    cache: "no-store",
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`

    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join(", ") : body.message
      }
    } catch {
      // Response wasn't JSON — fall back to the status text above.
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/**
 * Same as `apiFetch`, but for multipart file uploads (profile pictures,
 * certificates) — `body` is a FormData containing the file, and unlike
 * `apiFetch` no Content-Type header is set manually so fetch can generate
 * the correct multipart boundary itself.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData,
    headers: await authHeader(),
    cache: "no-store",
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`

    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join(", ") : body.message
      }
    } catch {
      // Response wasn't JSON — fall back to the status text above.
    }

    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }

export async function apiFetchSafe<T>(path: string): Promise<ApiResult<T>> {
  try {
    const data = await apiFetch<T>(path)
    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      status: error instanceof ApiError ? error.status : undefined,
      error:
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? `Could not reach the API at ${API_BASE_URL} — ${error.message}`
            : `Could not reach the API at ${API_BASE_URL}.`,
    }
  }
}

/**
 * Like `apiFetchSafe`, but for GET endpoints whose data barely changes —
 * reference/lookup tables like departments, branches, and bands (a handful
 * of rows, edited rarely by HR admins) rather than employee records or
 * anything that needs to reflect the latest write immediately. Uses Next's
 * fetch cache (`next: { revalidate }`) instead of `no-store`, so repeat
 * page loads within the window reuse the cached response instead of
 * re-querying Postgres every time.
 *
 * Caveat worth knowing: the Authorization header (a different token per
 * logged-in session) is part of what Next.js keys this cache on, so this
 * caches per-session, not across every user bank-wide — still a real win
 * for one admin clicking between several pages that each need the same
 * department list, just not the full "one shared cache for everyone"
 * ideal. Sharing it across sessions would mean serving these specific
 * lookup endpoints without requiring auth, which is a deliberate
 * trade-off call, not something to flip on quietly here.
 */
export async function apiFetchCached<T>(path: string, revalidateSeconds: number): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      next: { revalidate: revalidateSeconds },
    })

    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`
      try {
        const body = (await response.json()) as { message?: string | string[] }
        if (body?.message) message = Array.isArray(body.message) ? body.message.join(", ") : body.message
      } catch {
        // Response wasn't JSON — fall back to the status text above.
      }
      return { ok: false, status: response.status, error: message }
    }

    return { ok: true, data: (await response.json()) as T }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `Could not reach the API at ${API_BASE_URL} — ${error.message}` : `Could not reach the API at ${API_BASE_URL}.`,
    }
  }
}
