import { apiFetch } from "./client"

/** Shape of POST /auth/login's response — a signed JWT (see
 *  server/src/modules/auth/auth.service.ts) carrying the SessionUser claims
 *  directly, not a raw employee record. lib/session.ts's decodeSession()
 *  verifies and decodes it into a SessionUser. */
export interface LoginResponse {
  accessToken: string
}

/** Only ever called from Server Actions (see app/login/actions.ts) — like
 *  the rest of lib/api, this talks to the internal NestJS API URL and must
 *  never be imported into a Client Component. No Authorization header is
 *  sent (there's no session cookie yet) — the API's @Public() login route
 *  doesn't require one. */
export function loginRequest(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function changePasswordRequest(employeeId: string, currentPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ employeeId, currentPassword, newPassword }),
  })
}

export function acceptTermsRequest(employeeId: string) {
  return apiFetch<{ success: boolean }>("/auth/accept-terms", {
    method: "POST",
    body: JSON.stringify({ employeeId }),
  })
}
