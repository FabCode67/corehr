import { ExitReason, ExitType } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { isBlank, normalizeEnum, normalizeString, requireField, rowFingerprint, validateDate, validateEnum, parseFlexibleDate } from "../validators.util"

const REASON_VALUES = Object.values(ExitReason)
const TYPE_VALUES = Object.values(ExitType)

/**
 * Every row must reference an existing, currently-ACTIVE employee — this
 * module never creates employees, and can't re-process someone already
 * exited (matches EmployeesService.processExit's own one-way guard).
 * "Exit Date" maps to Employee.exitInitiatedAt (when the exit was recorded)
 * and "Last Working Day" maps to Employee.exitDate (the schema's actual
 * "final day" field, used to close out position history) — the schema only
 * has one true exit-date field, and exitInitiatedAt already exists for
 * exactly the "when was this recorded" purpose. "Clearance Status" has no
 * dedicated field (clearance is tracked via the linked Exit Form's
 * FormInstance status elsewhere in the app) — it's appended into
 * exitComments as a note. "Exit Type" isn't in the spec's field list but is
 * required by processExit(); defaults to NON_REGRETTABLE when left blank.
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "exitDate", header: "Exit Date", required: false, example: "2026-01-15", description: "When the exit was recorded/initiated." },
  { key: "reason", header: "Reason", required: true, example: "RESIGNATION", description: REASON_VALUES.join(" | ") },
  { key: "lastWorkingDay", header: "Last Working Day", required: true, example: "2026-02-15" },
  { key: "exitType", header: "Exit Type", required: false, example: "NON_REGRETTABLE", description: TYPE_VALUES.join(" | ") + " (defaults to NON_REGRETTABLE)" },
  { key: "clearanceStatus", header: "Clearance Status", required: false, example: "Pending IT clearance" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const employees = await prisma.employee.findMany({ select: { employeeNumber: true, employmentStatus: true } })
  return {
    employeesByNumber: new Map(employees.map((e) => [e.employeeNumber, e])),
  }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const employeesByNumber = ctx.employeesByNumber as Map<string, { employeeNumber: string; employmentStatus: string }>

  for (const label of ["Employee Number", "Reason", "Last Working Day"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  const employee = employeeNumber ? employeesByNumber.get(employeeNumber) : undefined
  if (employeeNumber && !employee) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  } else if (employee && employee.employmentStatus !== "ACTIVE") {
    errors.push(`Employee "${employeeNumber}" has already exited — the exit process can't be run twice.`)
  }

  const reasonError = validateEnum(raw["Reason"], "Reason", REASON_VALUES)
  if (reasonError) errors.push(reasonError)
  if (!isBlank(raw["Exit Type"])) {
    const error = validateEnum(raw["Exit Type"], "Exit Type", TYPE_VALUES)
    if (error) errors.push(error)
  }
  const exitDateError = validateDate(raw["Exit Date"], "Exit Date")
  if (exitDateError) errors.push(exitDateError)
  const lastWorkingDayError = validateDate(raw["Last Working Day"], "Last Working Day")
  if (lastWorkingDayError) errors.push(lastWorkingDayError)

  const fingerprint = rowFingerprint(employeeNumber)
  const isDuplicateInFile = employeeNumber ? seen.has(fingerprint) : false
  if (employeeNumber) seen.add(fingerprint)

  const data = {
    employeeNumber,
    exitInitiatedAt: parseFlexibleDate(raw["Exit Date"]),
    exitReason: normalizeEnum(raw["Reason"], REASON_VALUES),
    exitDate: parseFlexibleDate(raw["Last Working Day"]),
    exitType: normalizeEnum(raw["Exit Type"], TYPE_VALUES) ?? "NON_REGRETTABLE",
    exitComments: normalizeString(raw["Clearance Status"]) ? `Clearance status at import: ${raw["Clearance Status"]}` : undefined,
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : "updated"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, _tx: unknown, _ctx: ImportContext, importedById: string, deps: ImportDeps) {
  // Reuses EmployeesService.processExit — see employees.config.ts's doc
  // comment on why business-logic side effects (closing PositionHistory,
  // clearing positionId) matter more here than transactional atomicity
  // across the whole import job.
  const data = row.data as {
    employeeNumber: string
    exitInitiatedAt?: Date
    exitReason: string
    exitDate: Date
    exitType: string
    exitComments?: string
  }
  const { employeesService, prisma } = deps

  if (data.exitInitiatedAt) {
    await prisma.employee.updateMany({
      where: { employeeNumber: data.employeeNumber, exitInitiatedAt: null },
      data: { exitInitiatedAt: data.exitInitiatedAt, exitInitiatedById: importedById },
    })
  }

  await employeesService.processExit(data.employeeNumber, {
    exitDate: data.exitDate,
    exitReason: data.exitReason as never,
    exitType: data.exitType as never,
    comments: data.exitComments,
  } as never)

  return { action: "updated" as const, employeeNumber: data.employeeNumber }
}

export const exitImportConfig: ImportModuleConfig = {
  key: "exit",
  label: "Exit Management",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "employeeNumberUpdate",
  usesTransaction: false,
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow: applyRow as ImportModuleConfig["applyRow"],
}
