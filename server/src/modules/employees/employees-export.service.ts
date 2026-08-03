import { Injectable } from "@nestjs/common"
import type { Prisma } from "@prisma/client"
import * as XLSX from "xlsx"

import { buildCsv } from "../imports/spreadsheet.util"

import type { EMPLOYEE_EXPORT_INCLUDE } from "./employees.service"

type ExportEmployee = Prisma.EmployeeGetPayload<{ include: typeof EMPLOYEE_EXPORT_INCLUDE }>
type LineManagerMap = Record<string, { id: string; firstName: string; lastName: string } | null>

export type EmployeeExportGroup = "Personal Information" | "Employment" | "Exit Management" | "System Access"

export interface EmployeeExportColumn {
  key: string
  label: string
  group: EmployeeExportGroup
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ")
}

function formatDate(value: Date | null): string {
  if (!value) return ""
  return value.toISOString().slice(0, 10)
}

/** Mirrors client/lib/api/employees.ts's computeTenure() exactly — kept as a
 *  second, server-side implementation (not imported, the two apps don't
 *  share code) so an exported "Tenure"/"Banking Experience (Current)" column
 *  always matches what the admin table itself shows for the same employee. */
function computeTenureYears(employmentStartDate: Date | null): { years: number; months: number; totalYears: number } | null {
  if (!employmentStartDate) return null
  const start = employmentStartDate
  const now = new Date()
  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) return null
  return { years, months, totalYears: years + months / 12 }
}

/**
 * The full catalog of columns an admin can pick from when exporting the
 * Employees table — deliberately curated (not a raw dump of every Employee
 * column) to exclude internal-only fields (passwordHash, UUIDs, reporting-
 * override plumbing) that would be meaningless or a security concern in a
 * downloadable file. Labels mirror the Bulk Import module's column headers
 * (server/src/modules/imports/registry/employees.config.ts) wherever the
 * same underlying field exists, so a file exported here and one built for
 * re-import use recognizably the same vocabulary.
 */
export const EMPLOYEE_EXPORT_COLUMNS: EmployeeExportColumn[] = [
  { key: "employeeNumber", label: "Employee Number", group: "Personal Information" },
  { key: "firstName", label: "First Name", group: "Personal Information" },
  { key: "middleName", label: "Middle Name", group: "Personal Information" },
  { key: "lastName", label: "Last Name", group: "Personal Information" },
  { key: "preferredName", label: "Preferred Name", group: "Personal Information" },
  { key: "gender", label: "Gender", group: "Personal Information" },
  { key: "dateOfBirth", label: "Date of Birth", group: "Personal Information" },
  { key: "nationalId", label: "National ID", group: "Personal Information" },
  { key: "passport", label: "Passport", group: "Personal Information" },
  { key: "nationality", label: "Nationality", group: "Personal Information" },
  { key: "maritalStatus", label: "Marital Status", group: "Personal Information" },
  { key: "email", label: "Email", group: "Personal Information" },
  { key: "phone", label: "Phone", group: "Personal Information" },
  { key: "address", label: "Address", group: "Personal Information" },
  { key: "emergencyContact", label: "Emergency Contact", group: "Personal Information" },

  { key: "branch", label: "Branch", group: "Employment" },
  { key: "function", label: "Function", group: "Employment" },
  { key: "department", label: "Department", group: "Employment" },
  { key: "unit", label: "Unit", group: "Employment" },
  { key: "position", label: "Position", group: "Employment" },
  { key: "level", label: "Level", group: "Employment" },
  { key: "band", label: "Band", group: "Employment" },
  { key: "lineManager", label: "Line Manager", group: "Employment" },
  { key: "employmentType", label: "Employment Type", group: "Employment" },
  { key: "joinedDate", label: "Joined Date", group: "Employment" },
  { key: "probationEndDate", label: "Probation End Date", group: "Employment" },
  { key: "contractEndDate", label: "Contract End Date", group: "Employment" },
  { key: "status", label: "Status", group: "Employment" },
  { key: "tenure", label: "Tenure", group: "Employment" },
  { key: "bankingExperiencePrevious", label: "Banking Experience (Previous)", group: "Employment" },
  { key: "bankingExperienceCurrent", label: "Banking Experience (Current)", group: "Employment" },
  { key: "bankingExperienceTotal", label: "Banking Experience (Total)", group: "Employment" },

  { key: "exitDate", label: "Exit Date", group: "Exit Management" },
  { key: "exitReason", label: "Exit Reason", group: "Exit Management" },
  { key: "exitType", label: "Exit Type", group: "Exit Management" },
  { key: "nextMove", label: "Next Move", group: "Exit Management" },

  { key: "isAdmin", label: "Admin Access", group: "System Access" },
]

@Injectable()
export class EmployeesExportService {
  /** Filters a requested column-key list down to only real, known columns —
   *  called with whatever a query string hands us, so this is also the
   *  validation boundary (an unknown key is silently dropped, not an error,
   *  since the worst case is just a smaller file than expected). */
  resolveColumns(requestedKeys: string[]): EmployeeExportColumn[] {
    const byKey = new Map(EMPLOYEE_EXPORT_COLUMNS.map((c) => [c.key, c]))
    const resolved = requestedKeys.map((key) => byKey.get(key)).filter((c): c is EmployeeExportColumn => Boolean(c))
    return resolved.length > 0 ? resolved : EMPLOYEE_EXPORT_COLUMNS
  }

  private getValue(employee: ExportEmployee, lineManagers: LineManagerMap, key: string): string | number {
    switch (key) {
      case "employeeNumber":
        return employee.employeeNumber
      case "firstName":
        return employee.firstName
      case "middleName":
        return employee.middleName ?? ""
      case "lastName":
        return employee.lastName
      case "preferredName":
        return employee.preferredName ?? ""
      case "gender":
        return titleCase(employee.gender)
      case "dateOfBirth":
        return formatDate(employee.dateOfBirth)
      case "nationalId":
        return employee.nationalIdNumber
      case "passport":
        return employee.passportNumber ?? ""
      case "nationality":
        return employee.nationality
      case "maritalStatus":
        return titleCase(employee.maritalStatus)
      case "email":
        return employee.email
      case "phone":
        return employee.phone
      case "address":
        return employee.address ?? ""
      case "emergencyContact":
        return employee.emergencyContact ?? ""
      case "branch":
        return employee.branch?.name ?? ""
      case "function":
        return employee.position?.department.function.name ?? ""
      case "department":
        return employee.position?.department.name ?? ""
      case "unit":
        return employee.position?.unit?.name ?? ""
      case "position":
        return employee.position?.title ?? ""
      case "level":
        return employee.position?.level.code ?? employee.position?.level.name ?? ""
      case "band":
        return employee.band?.name ?? ""
      case "lineManager": {
        const manager = lineManagers[employee.employeeNumber]
        return manager ? `${manager.firstName} ${manager.lastName}` : ""
      }
      case "employmentType":
        return employee.contractType ? titleCase(employee.contractType) : ""
      case "joinedDate":
        return formatDate(employee.employmentStartDate)
      case "probationEndDate":
        return formatDate(employee.probationEndDate)
      case "contractEndDate":
        return formatDate(employee.contractEndDate)
      case "status":
        return titleCase(employee.employmentStatus)
      case "tenure": {
        const tenure = computeTenureYears(employee.employmentStartDate)
        return tenure ? `${tenure.years}y ${tenure.months}m` : ""
      }
      case "bankingExperiencePrevious":
        return employee.previousBankingExperienceYears ?? ""
      case "bankingExperienceCurrent": {
        const tenure = computeTenureYears(employee.employmentStartDate)
        return tenure ? Math.round(tenure.totalYears * 10) / 10 : ""
      }
      case "bankingExperienceTotal": {
        const previous = employee.previousBankingExperienceYears ?? 0
        const tenure = computeTenureYears(employee.employmentStartDate)
        if (employee.previousBankingExperienceYears === null && !tenure) return ""
        return Math.round((previous + (tenure?.totalYears ?? 0)) * 10) / 10
      }
      case "exitDate":
        return formatDate(employee.exitDate)
      case "exitReason":
        return employee.exitReason ? titleCase(employee.exitReason) : ""
      case "exitType":
        return employee.exitType ? titleCase(employee.exitType) : ""
      case "nextMove":
        return employee.nextMove ?? ""
      case "isAdmin":
        return employee.isAdmin ? "Yes" : "No"
      default:
        return ""
    }
  }

  private buildRows(employees: ExportEmployee[], lineManagers: LineManagerMap, columns: EmployeeExportColumn[]): (string | number)[][] {
    return employees.map((employee) => columns.map((column) => this.getValue(employee, lineManagers, column.key)))
  }

  generateXlsx(employees: ExportEmployee[], lineManagers: LineManagerMap, columns: EmployeeExportColumn[]): Buffer {
    const headerRow = columns.map((c) => c.label)
    const rows = this.buildRows(employees, lineManagers, columns)
    const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...rows])
    sheet["!cols"] = columns.map((c) => ({ wch: Math.max(c.label.length + 2, 14) }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, "Employees")
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
  }

  generateCsv(employees: ExportEmployee[], lineManagers: LineManagerMap, columns: EmployeeExportColumn[]): Buffer {
    const headerRow = columns.map((c) => c.label)
    const rows = this.buildRows(employees, lineManagers, columns)
    return buildCsv(headerRow, rows)
  }
}
