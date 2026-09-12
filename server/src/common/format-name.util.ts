/** Shared "display name" formatter for server-generated output (PDFs,
 *  emails, exports) — mirrors client/lib/format-name.ts so a registered
 *  middle name shows up consistently everywhere a person's name is
 *  rendered, not just in the app UI. Omits middleName entirely when unset. */
export function fullName(person: { firstName: string; middleName?: string | null; lastName: string }): string {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ")
}
