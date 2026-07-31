import { EducationType, type Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { normalizeEnum, normalizeString, requireField, validateEnum, validateNumber } from "../validators.util"

const TYPE_VALUES = Object.values(EducationType)
const CURRENT_YEAR = new Date().getUTCFullYear()

/**
 * EmployeeEducation has no unique constraint beyond id — true insert-only,
 * no intra-file dedupe key is reliable enough to be worth flagging (the
 * same institution+qualification could legitimately repeat, e.g. two
 * separate certificates from the same school). "Type" isn't in the spec's
 * field list but is a required enum on the model; defaults to DEGREE.
 * "Start Year"/"End Year" (not full dates, per the spec) are stored as
 * Jan 1 / Dec 31 of the given year.
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "institution", header: "Institution", required: true, example: "University of Rwanda" },
  { key: "qualification", header: "Qualification", required: true, example: "Bachelor of Commerce" },
  { key: "type", header: "Type", required: false, example: "DEGREE", description: TYPE_VALUES.join(" | ") + " (defaults to DEGREE)" },
  { key: "startYear", header: "Start Year", required: true, example: "2012" },
  { key: "endYear", header: "End Year", required: false, example: "2016" },
  { key: "grade", header: "Grade", required: false, example: "First Class" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const employees = await deps.prisma.employee.findMany({ select: { employeeNumber: true } })
  return { existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)) }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>

  for (const label of ["Employee Number", "Institution", "Qualification", "Start Year"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }

  if (raw["Type"]) {
    const error = validateEnum(raw["Type"], "Type", TYPE_VALUES)
    if (error) errors.push(error)
  }

  const startYearError = validateNumber(raw["Start Year"], "Start Year", { min: 1950, max: CURRENT_YEAR + 1 })
  if (startYearError) errors.push(startYearError)
  const endYearError = validateNumber(raw["End Year"], "End Year", { min: 1950, max: CURRENT_YEAR + 10 })
  if (endYearError) errors.push(endYearError)

  const data = {
    employeeId: employeeNumber,
    institution: normalizeString(raw["Institution"]),
    title: normalizeString(raw["Qualification"]),
    type: normalizeEnum(raw["Type"], TYPE_VALUES) ?? "DEGREE",
    startDate: raw["Start Year"] ? new Date(Date.UTC(Number(raw["Start Year"]), 0, 1)) : undefined,
    endDate: raw["End Year"] ? new Date(Date.UTC(Number(raw["End Year"]), 11, 31)) : undefined,
    grade: normalizeString(raw["Grade"]),
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : "new"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as { employeeId: string; institution: string; title: string; type: string; startDate: Date; endDate?: Date; grade?: string }
  await tx.employeeEducation.create({
    data: {
      employeeId: data.employeeId,
      institution: data.institution,
      title: data.title,
      type: data.type as never,
      startDate: data.startDate,
      endDate: data.endDate,
      grade: data.grade,
    },
  })
  return { action: "created" as const, employeeNumber: data.employeeId }
}

export const educationImportConfig: ImportModuleConfig = {
  key: "education",
  label: "Education",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "insertOnly",
  columns: COLUMNS,
  buildContext,
  validateRow: validateRow as ImportModuleConfig["validateRow"],
  applyRow,
}
