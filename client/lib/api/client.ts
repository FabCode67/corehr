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
 */

const API_BASE_URL = process.env.API_URL ?? "http://localhost:4000/api"

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
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
