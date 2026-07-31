import type { Branch } from "./branches"
import { apiFetch } from "./client"

/** Shape of POST /auth/login's response — never includes passwordHash
 *  (PrismaService omits it globally server-side; see server/src/prisma). */
export interface AuthEmployee {
  /** The Staff ID (e.g. "EMP-0001") — Employee's primary key everywhere. */
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  isAdmin: boolean
  branch: Branch | null
  isActive: boolean
  position: {
    title: string
    department: { name: string }
  } | null
  /** First Login Security — see app/change-password. */
  mustChangePassword: boolean
}

/** Only ever called from Server Actions (see app/login/actions.ts) — like
 *  the rest of lib/api, this talks to the internal NestJS API URL and must
 *  never be imported into a Client Component. */
export function loginRequest(email: string, password: string) {
  return apiFetch<AuthEmployee>("/auth/login", {
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
