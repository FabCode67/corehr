/**
 * Common, reusable row-level validation helpers shared by every import
 * module config. Each function returns a plain string error message (to
 * push onto ImportRowResult.errors) or null/undefined when the value is
 * fine — never throws, so a module config can freely call several of
 * these per column without try/catch.
 */

// Same phone shape CreateEmployeeDto already validates against, reused so
// the import framework and the manual "Add Employee" form agree on what a
// valid phone number looks like.
const PHONE_REGEX = /^\+?[0-9 ()-]{7,20}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim().length === 0
}

export function requireField(value: unknown, label: string): string | null {
  return isBlank(value) ? `${label} is required.` : null
}

export function validateEmail(value: unknown, label = "Email"): string | null {
  if (isBlank(value)) return null
  return EMAIL_REGEX.test(String(value).trim()) ? null : `${label} "${value}" is not a valid email address.`
}

export function validatePhone(value: unknown, label = "Phone"): string | null {
  if (isBlank(value)) return null
  return PHONE_REGEX.test(String(value).trim()) ? null : `${label} "${value}" is not a valid phone number.`
}

/**
 * Accepts ISO (YYYY-MM-DD), slash-separated (DD/MM/YYYY or MM/DD/YYYY —
 * ambiguous ones are read as DD/MM/YYYY, the convention used everywhere
 * else in this system), and native Excel date cells (already a Date
 * object once xlsx's cellDates:true parses them). Returns null on failure
 * so the caller can push a validation error, or a valid Date otherwise.
 */
export function parseFlexibleDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value

  const text = String(value).trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (isoMatch) {
    const date = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
    return isNaN(date.getTime()) ? null : date
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    return isNaN(date.getTime()) ? null : date
  }

  const fallback = new Date(text)
  return isNaN(fallback.getTime()) ? null : fallback
}

export function validateDate(value: unknown, label: string): string | null {
  if (isBlank(value)) return null
  return parseFlexibleDate(value) ? null : `${label} "${value}" is not a valid date (use YYYY-MM-DD).`
}

export function validateNumber(value: unknown, label: string, opts?: { min?: number; max?: number }): string | null {
  if (isBlank(value)) return null
  const num = Number(value)
  if (Number.isNaN(num)) return `${label} "${value}" is not a valid number.`
  if (opts?.min !== undefined && num < opts.min) return `${label} must be at least ${opts.min}.`
  if (opts?.max !== undefined && num > opts.max) return `${label} must be at most ${opts.max}.`
  return null
}

export function validateEnum(value: unknown, label: string, allowed: readonly string[]): string | null {
  if (isBlank(value)) return null
  const text = String(value).trim()
  const match = allowed.find((option) => option.toLowerCase() === text.toLowerCase())
  return match ? null : `${label} "${value}" must be one of: ${allowed.join(", ")}.`
}

/** Case-insensitive exact match against the enum list, or undefined if
 *  blank/no match — pairs with validateEnum, which should be called first. */
export function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (isBlank(value)) return undefined
  const text = String(value).trim()
  return allowed.find((option) => option.toLowerCase() === text.toLowerCase())
}

export function normalizeString(value: unknown): string | undefined {
  if (isBlank(value)) return undefined
  return String(value).trim()
}

export function normalizeNumber(value: unknown): number | undefined {
  if (isBlank(value)) return undefined
  const num = Number(value)
  return Number.isNaN(num) ? undefined : num
}

/** Builds a stable natural-key string from several row fields, for
 *  duplicate-row-within-file detection via the `seen` Set every config
 *  receives in validateRow(). */
export function rowFingerprint(...parts: unknown[]): string {
  return parts.map((part) => (isBlank(part) ? "" : String(part).trim().toLowerCase())).join("|")
}
