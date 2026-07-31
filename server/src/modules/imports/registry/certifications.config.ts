import type { Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { normalizeString, parseFlexibleDate, requireField, rowFingerprint, validateDate } from "../validators.util"

const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "certification", header: "Certification", required: true, example: "Certified Anti-Money Laundering Specialist" },
  { key: "issuer", header: "Issuer", required: true, example: "ACAMS" },
  { key: "issueDate", header: "Issue Date", required: true, example: "2024-06-01" },
  { key: "expiryDate", header: "Expiry Date", required: false, example: "2027-06-01" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const employees = await deps.prisma.employee.findMany({ select: { employeeNumber: true } })
  return { existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)) }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>

  for (const label of ["Employee Number", "Certification", "Issuer", "Issue Date"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }

  const issueDateError = validateDate(raw["Issue Date"], "Issue Date")
  if (issueDateError) errors.push(issueDateError)
  const expiryDateError = validateDate(raw["Expiry Date"], "Expiry Date")
  if (expiryDateError) errors.push(expiryDateError)

  const fingerprint = rowFingerprint(employeeNumber, raw["Certification"], raw["Issue Date"])
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data = {
    employeeId: employeeNumber,
    name: normalizeString(raw["Certification"]),
    issuer: normalizeString(raw["Issuer"]),
    issueDate: parseFlexibleDate(raw["Issue Date"]),
    expiryDate: parseFlexibleDate(raw["Expiry Date"]),
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : "new"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as { employeeId: string; name: string; issuer: string; issueDate: Date; expiryDate?: Date }
  await tx.employeeCertification.create({
    data: { employeeId: data.employeeId, name: data.name, issuer: data.issuer, issueDate: data.issueDate, expiryDate: data.expiryDate },
  })
  return { action: "created" as const, employeeNumber: data.employeeId }
}

export const certificationsImportConfig: ImportModuleConfig = {
  key: "certifications",
  label: "Certifications",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "insertOnly",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
