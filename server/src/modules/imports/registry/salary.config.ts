import type { Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { normalizeNumber, normalizeString, parseFlexibleDate, requireField, rowFingerprint, validateDate, validateNumber } from "../validators.util"

const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "basicSalary", header: "Basic Salary", required: true, example: "800000" },
  { key: "housingAllowance", header: "Housing Allowance", required: false, example: "150000" },
  { key: "transportAllowance", header: "Transport Allowance", required: false, example: "80000" },
  { key: "otherAllowances", header: "Other Allowances", required: false, example: "0" },
  { key: "effectiveDate", header: "Effective Date", required: true, example: "2026-01-01" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const employees = await deps.prisma.employee.findMany({ select: { employeeNumber: true } })
  return { existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)) }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>

  for (const label of ["Employee Number", "Basic Salary", "Effective Date"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }

  for (const label of ["Basic Salary", "Housing Allowance", "Transport Allowance", "Other Allowances"]) {
    const error = validateNumber(raw[label], label, { min: 0 })
    if (error) errors.push(error)
  }

  const effectiveDateError = validateDate(raw["Effective Date"], "Effective Date")
  if (effectiveDateError) errors.push(effectiveDateError)

  const fingerprint = rowFingerprint(employeeNumber, raw["Effective Date"])
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data = {
    employeeId: employeeNumber,
    basicSalary: normalizeNumber(raw["Basic Salary"]),
    housingAllowance: normalizeNumber(raw["Housing Allowance"]) ?? 0,
    transportAllowance: normalizeNumber(raw["Transport Allowance"]) ?? 0,
    otherAllowances: normalizeNumber(raw["Other Allowances"]) ?? 0,
    effectiveDate: parseFlexibleDate(raw["Effective Date"]),
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : "new"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as {
    employeeId: string
    basicSalary: number
    housingAllowance: number
    transportAllowance: number
    otherAllowances: number
    effectiveDate: Date
  }
  await tx.employeeSalaryRecord.create({
    data: {
      employeeId: data.employeeId,
      basicSalary: data.basicSalary,
      housingAllowance: data.housingAllowance,
      transportAllowance: data.transportAllowance,
      otherAllowances: data.otherAllowances,
      effectiveDate: data.effectiveDate,
    },
  })
  return { action: "created" as const, employeeNumber: data.employeeId }
}

export const salaryImportConfig: ImportModuleConfig = {
  key: "salary",
  label: "Salary",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "insertOnly",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
