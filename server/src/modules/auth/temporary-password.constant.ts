/** How long a new employee's default password (DEFAULT_EMPLOYEE_PASSWORD)
 *  remains valid before AuthService.login() refuses to authenticate them —
 *  see First Login Security in the Email Notification & Automation spec.
 *  Configurable via env so a deployment can loosen/tighten it without a
 *  code change; falls back to 7 days. */
export const TEMPORARY_PASSWORD_EXPIRY_DAYS = Number(process.env.TEMP_PASSWORD_EXPIRY_DAYS ?? 7)

export function computeTemporaryPasswordExpiry(from: Date = new Date()): Date {
  const expiry = new Date(from)
  expiry.setDate(expiry.getDate() + TEMPORARY_PASSWORD_EXPIRY_DAYS)
  return expiry
}
