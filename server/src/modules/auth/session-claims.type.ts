/**
 * The JWT payload shape — deliberately mirrors client/lib/session.ts's
 * SessionUser exactly, field for field. That file's cookie IS this token
 * (not a separate re-encoded thing), so the client can decode+verify it
 * directly into the SessionUser shape it already renders everywhere
 * without a second round trip back to the API. Keep the two in sync if
 * either changes.
 */
export interface SessionClaims {
  id: string
  name: string
  email: string
  role: "staff" | "admin"
  jobTitle: string
  department: string
  branch: string
  employeeId: string
  mustChangePassword: boolean
}
