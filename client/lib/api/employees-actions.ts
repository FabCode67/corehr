"use server"

import { fetchEmployeeByNumber, fetchEmployeesPaginated } from "./employees"
import { fullName } from "../format-name"

/**
 * Client-callable search (wraps the paginated Server-Component fetcher so a
 * "use client" SearchableSelectAsync can call it directly as a Server
 * Action) — this is what lets employee pickers stop shipping the entire
 * employee table to the browser: only a small page of DB-level search
 * matches ever crosses the network, the same "search by name/
 * employeeNumber/email" query EmployeesService.findAllPaginated already
 * supports for the admin table. See searchInstitutionsAction/
 * searchSkillsAction in professional-profile-actions.ts for the identical
 * pattern this mirrors.
 */

export interface EmployeeOption {
  value: string
  label: string
}

export async function searchEmployeesAction(query: string, excludeEmployeeNumber?: string): Promise<EmployeeOption[]> {
  const trimmed = query.trim()
  if (trimmed.length < 1) return []
  const result = await fetchEmployeesPaginated({ search: trimmed, pageSize: excludeEmployeeNumber ? 21 : 20 })
  if (!result.ok) return []
  return result.data.data
    .filter((employee) => employee.employeeNumber !== excludeEmployeeNumber)
    .slice(0, 20)
    .map((employee) => ({
      value: employee.employeeNumber,
      label: `${fullName(employee)} (${employee.employeeNumber})`,
    }))
}

/** Resolves a single employeeNumber into its display label — used so an
 *  async picker can show the already-selected employee's name on an edit
 *  form (where a value/defaultValue is set up front) without needing the
 *  full employee list just to look up one label. */
export async function resolveEmployeeOptionAction(employeeNumber: string): Promise<EmployeeOption | null> {
  if (!employeeNumber) return null
  const result = await fetchEmployeeByNumber(employeeNumber)
  if (!result.ok) return null
  return { value: result.data.employeeNumber, label: `${fullName(result.data)} (${result.data.employeeNumber})` }
}
