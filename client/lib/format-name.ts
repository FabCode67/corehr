/** Shared "display name" formatter — every place in the app that lists a
 *  person by name should go through this instead of hand-rolling
 *  `${firstName} ${lastName}`, so a registered middle name always shows up
 *  consistently everywhere the person appears (tables, dropdowns, cards,
 *  org chart, notifications, PDFs, etc.). Omits middleName entirely when
 *  unset, so existing records without one render exactly as before. */
export function fullName(person: { firstName: string; middleName?: string | null; lastName: string }): string {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ")
}
