import { Injectable } from "@nestjs/common"
import * as XLSX from "xlsx"

import { PrismaService } from "../../../prisma/prisma.service"
import { buildTemplateWorkbook, parseSpreadsheet, SpreadsheetParseError } from "../../imports/spreadsheet.util"
import type { ImportTemplateColumn } from "../../imports/registry/types"

export const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const

export type MonthKey = (typeof MONTH_KEYS)[number]

const MONTH_LABELS: Record<MonthKey, string> = {
  january: "January",
  february: "February",
  march: "March",
  april: "April",
  may: "May",
  june: "June",
  july: "July",
  august: "August",
  september: "September",
  october: "October",
  november: "November",
  december: "December",
}

export interface AnnualLeavePlanUploadSummary {
  totalRows: number
  created: number
  updated: number
  errors: string[]
}

interface ParsedPlanRow {
  rowNumber: number
  employeeNumber: string
  carryForwardBalance: number
  annualEntitlement: number
  totalEntitled: number
  leaveTaken: number
  leaveBalance: number
  months: Record<MonthKey, number>
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (trimmed === "") return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Finds the first header in a row whose normalized text passes `test` —
 *  used instead of an exact-string header match so a downloaded template
 *  from a prior year (with a different embedded year in the CF Balance /
 *  Leave Days column labels) still parses correctly. */
function findByHeader(row: Record<string, string>, test: (normalizedHeader: string) => boolean): string | undefined {
  for (const header of Object.keys(row)) {
    if (test(header.toLowerCase())) return row[header]
  }
  return undefined
}

/**
 * ANNUAL LEAVE PLAN — lets a Head of Department upload (and HR view/export/
 * chart, bank-wide) a spreadsheet forecasting when each of their employees
 * intends to take annual leave for a given year. Deliberately a separate
 * planning layer from the LeaveRequest/approval workflow — uploading a plan
 * never creates, approves, or otherwise touches actual leave requests; it's
 * a forecast HR reviews and compares against, not a transaction. Access
 * control (who may upload/view which department's plan) lives entirely in
 * the callers — DepartmentDashboardService for Heads of Department, and
 * AnnualLeavePlanController's own isAdmin check for HR's bank-wide view —
 * this service only ever operates on department id(s) it's given.
 */
@Injectable()
export class AnnualLeavePlanService {
  constructor(private readonly prisma: PrismaService) {}

  private templateColumns(year: number): ImportTemplateColumn[] {
    return [
      { key: "staffId", header: "Staff ID", required: true, example: "EMP-0001" },
      { key: "staffName", header: "Staff Name", required: false, example: "Jane Doe" },
      { key: "cfBalance", header: `${year - 1} CF Balance`, required: false, example: "0" },
      { key: "entitlement", header: `${year} Leave Days`, required: false, example: "24" },
      { key: "totalEntitled", header: "Total Leave Entitled", required: false, example: "24" },
      { key: "leaveTaken", header: "Leave Taken", required: false, example: "0" },
      { key: "leaveBalance", header: "Leave Balance", required: false, example: "24" },
      ...MONTH_KEYS.map((month) => ({ key: month, header: MONTH_LABELS[month], required: false, example: "" })),
    ]
  }

  /** Downloadable, pre-filled template for the given employees — CF Balance/
   *  Leave Days/Leave Taken columns are pulled live from each employee's
   *  current ANNUAL LeaveBalance record so the department head starts from
   *  real figures and only has to fill in the 12 monthly planned-days
   *  columns. */
  async buildTemplate(employeeNumbers: string[], year: number): Promise<Buffer> {
    const columns = this.templateColumns(year)
    if (employeeNumbers.length === 0) {
      return buildTemplateWorkbook(columns)
    }

    const [employees, annualLeaveType] = await Promise.all([
      this.prisma.employee.findMany({
        where: { employeeNumber: { in: employeeNumbers } },
        select: { employeeNumber: true, firstName: true, middleName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      this.prisma.leaveType.findFirst({ where: { category: "ANNUAL" }, select: { id: true } }),
    ])

    const balanceByEmployee = new Map<string, { entitledDays: number; carriedForwardDays: number; adjustmentDays: number; takenDays: number; pendingDays: number }>()
    if (annualLeaveType) {
      const balances = await this.prisma.leaveBalance.findMany({
        where: { leaveTypeId: annualLeaveType.id, year, employeeId: { in: employeeNumbers } },
        select: { employeeId: true, entitledDays: true, carriedForwardDays: true, adjustmentDays: true, takenDays: true, pendingDays: true },
      })
      for (const balance of balances) balanceByEmployee.set(balance.employeeId, balance)
    }

    const rows = employees.map((employee) => {
      const balance = balanceByEmployee.get(employee.employeeNumber)
      const cfBalance = balance?.carriedForwardDays ?? 0
      const entitlement = balance?.entitledDays ?? 0
      const totalEntitled = cfBalance + entitlement + (balance?.adjustmentDays ?? 0)
      const leaveTaken = balance?.takenDays ?? 0
      const leaveBalance = totalEntitled - leaveTaken - (balance?.pendingDays ?? 0)

      const row: Record<string, string> = {
        staffId: employee.employeeNumber,
        staffName: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" "),
        cfBalance: String(cfBalance),
        entitlement: String(entitlement),
        totalEntitled: String(totalEntitled),
        leaveTaken: String(leaveTaken),
        leaveBalance: String(leaveBalance),
      }
      for (const month of MONTH_KEYS) row[month] = ""
      return row
    })

    return buildTemplateWorkbook(columns, rows)
  }

  /** Parses an uploaded spreadsheet into typed rows, tolerant of the CF
   *  Balance/Leave Days columns' embedded year changing between uploads
   *  (matches by normalized header text, not the year-specific label the
   *  template happened to be generated with). Row-level problems (missing
   *  Staff ID) are collected as errors rather than throwing, so one bad row
   *  doesn't block the rest of the file. */
  parseUpload(buffer: Buffer, fileName: string): { rows: ParsedPlanRow[]; errors: string[] } {
    const { rows } = parseSpreadsheet(buffer, fileName)
    const parsed: ParsedPlanRow[] = []
    const errors: string[] = []

    rows.forEach((row, index) => {
      const rowNumber = index + 2 // header is row 1
      const employeeNumber = (findByHeader(row, (h) => h === "staff id" || h === "staff number" || h === "employee number") ?? "").trim()
      if (!employeeNumber) {
        errors.push(`Row ${rowNumber}: missing Staff ID — skipped.`)
        return
      }

      const months = {} as Record<MonthKey, number>
      for (const month of MONTH_KEYS) {
        months[month] = toNumber(findByHeader(row, (h) => h === MONTH_LABELS[month].toLowerCase())) ?? 0
      }

      const carryForwardBalance = toNumber(findByHeader(row, (h) => h.includes("cf balance"))) ?? 0
      const annualEntitlement = toNumber(findByHeader(row, (h) => h.includes("leave days") && !h.includes("taken"))) ?? 0
      const leaveTaken = toNumber(findByHeader(row, (h) => h.includes("leave taken"))) ?? 0
      const providedTotal = toNumber(findByHeader(row, (h) => h.includes("total") && h.includes("entitled")))
      const providedBalance = toNumber(findByHeader(row, (h) => h.includes("leave balance")))
      const totalEntitled = providedTotal ?? carryForwardBalance + annualEntitlement
      const leaveBalance = providedBalance ?? totalEntitled - leaveTaken

      parsed.push({ rowNumber, employeeNumber, carryForwardBalance, annualEntitlement, totalEntitled, leaveTaken, leaveBalance, months })
    })

    return { rows: parsed, errors }
  }

  /** Persists a parsed, department-scoped upload — one upsert per (employee,
   *  year). `allowedEmployeeNumbers`, when provided, restricts which rows
   *  may be written at all (a Head of Department's own department cascade);
   *  pass `null` for an unrestricted HR/admin upload. Any row referencing an
   *  employee outside that scope, or an unknown Staff ID, is reported as an
   *  error and simply skipped rather than failing the whole upload. */
  async upload(
    buffer: Buffer,
    fileName: string,
    year: number,
    actingEmployeeId: string,
    allowedEmployeeNumbers: Set<string> | null
  ): Promise<AnnualLeavePlanUploadSummary> {
    let parsedResult: { rows: ParsedPlanRow[]; errors: string[] }
    try {
      parsedResult = this.parseUpload(buffer, fileName)
    } catch (error) {
      if (error instanceof SpreadsheetParseError) {
        return { totalRows: 0, created: 0, updated: 0, errors: [error.message] }
      }
      throw error
    }

    const { rows, errors } = parsedResult
    if (rows.length === 0) {
      return { totalRows: 0, created: 0, updated: 0, errors }
    }

    const employeeNumbers = [...new Set(rows.map((row) => row.employeeNumber))]
    const employees = await this.prisma.employee.findMany({
      where: { employeeNumber: { in: employeeNumbers } },
      select: { employeeNumber: true, position: { select: { departmentId: true } } },
    })
    const employeeById = new Map(employees.map((employee) => [employee.employeeNumber, employee]))

    let created = 0
    let updated = 0

    for (const row of rows) {
      const employee = employeeById.get(row.employeeNumber)
      if (!employee) {
        errors.push(`Row ${row.rowNumber}: Staff ID "${row.employeeNumber}" does not match any employee — skipped.`)
        continue
      }
      if (allowedEmployeeNumbers && !allowedEmployeeNumbers.has(row.employeeNumber)) {
        errors.push(`Row ${row.rowNumber}: Staff ID "${row.employeeNumber}" is not in your department — skipped.`)
        continue
      }
      if (!employee.position?.departmentId) {
        errors.push(`Row ${row.rowNumber}: "${row.employeeNumber}" has no position/department assigned — skipped.`)
        continue
      }

      const existing = await this.prisma.annualLeavePlanEntry.findUnique({
        where: { employeeId_year: { employeeId: row.employeeNumber, year } },
        select: { id: true },
      })

      await this.prisma.annualLeavePlanEntry.upsert({
        where: { employeeId_year: { employeeId: row.employeeNumber, year } },
        create: {
          employeeId: row.employeeNumber,
          year,
          departmentId: employee.position.departmentId,
          carryForwardBalance: row.carryForwardBalance,
          annualEntitlement: row.annualEntitlement,
          totalEntitled: row.totalEntitled,
          leaveTaken: row.leaveTaken,
          leaveBalance: row.leaveBalance,
          ...row.months,
          uploadedById: actingEmployeeId,
        },
        update: {
          departmentId: employee.position.departmentId,
          carryForwardBalance: row.carryForwardBalance,
          annualEntitlement: row.annualEntitlement,
          totalEntitled: row.totalEntitled,
          leaveTaken: row.leaveTaken,
          leaveBalance: row.leaveBalance,
          ...row.months,
          uploadedById: actingEmployeeId,
          uploadedAt: new Date(),
        },
      })

      if (existing) updated += 1
      else created += 1
    }

    return { totalRows: rows.length, created, updated, errors }
  }

  private readonly listInclude = {
    employee: { select: { employeeNumber: true, firstName: true, middleName: true, lastName: true } },
    department: { select: { id: true, name: true } },
  } as const

  /** `departmentIds` scopes to one Head of Department's cascade; omit it for
   *  HR's bank-wide view. */
  async getForDepartments(departmentIds: string[] | undefined, year: number) {
    return this.prisma.annualLeavePlanEntry.findMany({
      where: { year, ...(departmentIds ? { departmentId: { in: departmentIds } } : {}) },
      include: this.listInclude,
      orderBy: [{ department: { name: "asc" } }, { employee: { lastName: "asc" } }],
    })
  }

  /** Consolidated export — same column layout as the upload template, plus
   *  a leading Department column since HR's export can span every
   *  department at once. */
  async exportWorkbook(departmentIds: string[] | undefined, year: number): Promise<Buffer> {
    const rows = await this.getForDepartments(departmentIds, year)
    const headerRow = [
      "Department",
      "Staff ID",
      "Staff Name",
      `${year - 1} CF Balance`,
      `${year} Leave Days`,
      "Total Leave Entitled",
      "Leave Taken",
      "Leave Balance",
      ...MONTH_KEYS.map((month) => MONTH_LABELS[month]),
    ]
    const dataRows = rows.map((row) => [
      row.department.name,
      row.employee.employeeNumber,
      [row.employee.firstName, row.employee.middleName, row.employee.lastName].filter(Boolean).join(" "),
      String(row.carryForwardBalance),
      String(row.annualEntitlement),
      String(row.totalEntitled),
      String(row.leaveTaken),
      String(row.leaveBalance),
      ...MONTH_KEYS.map((month) => String(row[month])),
    ])

    const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
    sheet["!cols"] = headerRow.map((header) => ({ wch: Math.max(header.length + 2, 12) }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, `Annual Leave Plan ${year}`)
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
  }

  /** Chart data for both the department-head and HR-facing pages: total
   *  planned leave days per department (pie) and per month bank-wide or
   *  within scope (bar/column). */
  async analytics(departmentIds: string[] | undefined, year: number) {
    const rows = await this.getForDepartments(departmentIds, year)

    const byDepartmentMap = new Map<string, number>()
    const byMonth: Record<MonthKey, number> = MONTH_KEYS.reduce((acc, month) => ({ ...acc, [month]: 0 }), {} as Record<MonthKey, number>)
    let totalPlannedDays = 0
    let totalLeaveBalance = 0

    for (const row of rows) {
      const monthlyTotal = MONTH_KEYS.reduce((sum, month) => sum + row[month], 0)
      totalPlannedDays += monthlyTotal
      totalLeaveBalance += row.leaveBalance
      byDepartmentMap.set(row.department.name, (byDepartmentMap.get(row.department.name) ?? 0) + monthlyTotal)
      for (const month of MONTH_KEYS) byMonth[month] += row[month]
    }

    return {
      totalEmployeesPlanned: rows.length,
      totalPlannedDays,
      averageLeaveBalance: rows.length === 0 ? 0 : Math.round((totalLeaveBalance / rows.length) * 10) / 10,
      byDepartment: Array.from(byDepartmentMap.entries())
        .map(([departmentName, plannedDays]) => ({ departmentName, plannedDays }))
        .sort((a, b) => b.plannedDays - a.plannedDays),
      byMonth: MONTH_KEYS.map((month) => ({ month: MONTH_LABELS[month], plannedDays: byMonth[month] })),
    }
  }
}
