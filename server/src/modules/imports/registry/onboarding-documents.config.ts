import type { Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { isBlank, normalizeEnum, normalizeString, parseFlexibleDate, requireField, rowFingerprint, validateDate, validateEnum } from "../validators.util"

const STATUS_VALUES = ["NOT_STARTED", "UPLOADED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"] as const

/**
 * OnboardingDocumentAssignment enforces @@unique([employeeId,
 * documentTypeId]) — upsert-by-composite-key, same justified exception as
 * Performance/Training. "Required" and "Submitted" are informational only:
 * "Required" already lives on the OnboardingDocumentType itself
 * (isMandatory), and "Submitted" is fully derivable from Status
 * (NOT_STARTED = not submitted, anything else = submitted) — neither is a
 * separate writable field on the assignment, so both are validated as
 * Yes/No but not persisted.
 */
const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "document", header: "Document", required: true, example: "National ID Copy" },
  { key: "required", header: "Required", required: false, example: "Yes", description: "Informational — Yes/No. The document type's own Mandatory setting is what's actually enforced." },
  { key: "submitted", header: "Submitted", required: false, example: "Yes", description: "Informational — Yes/No. Derived from Status." },
  { key: "submissionDate", header: "Submission Date", required: false, example: "2026-01-15" },
  { key: "status", header: "Status", required: true, example: "APPROVED", description: STATUS_VALUES.join(" | ") },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [employees, documentTypes, existingAssignments] = await Promise.all([
    prisma.employee.findMany({ select: { employeeNumber: true } }),
    prisma.onboardingDocumentType.findMany({ select: { id: true, name: true } }),
    prisma.onboardingDocumentAssignment.findMany({ select: { employeeId: true, documentTypeId: true } }),
  ])
  return {
    existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)),
    documentTypes,
    existingKeys: new Set(existingAssignments.map((a) => `${a.employeeId}|${a.documentTypeId}`)),
  }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>
  const documentTypes = ctx.documentTypes as { id: string; name: string }[]
  const existingKeys = ctx.existingKeys as Set<string>

  for (const label of ["Employee Number", "Document", "Status"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }

  let documentTypeId: string | undefined
  if (!isBlank(raw["Document"])) {
    const documentType = documentTypes.find((d) => d.name.toLowerCase() === raw["Document"].toLowerCase())
    if (!documentType) errors.push(`Document "${raw["Document"]}" does not exist as a configured document type.`)
    else documentTypeId = documentType.id
  }

  const statusError = validateEnum(raw["Status"], "Status", STATUS_VALUES)
  if (statusError) errors.push(statusError)

  const submissionDateError = validateDate(raw["Submission Date"], "Submission Date")
  if (submissionDateError) errors.push(submissionDateError)

  const naturalKey = documentTypeId && employeeNumber ? `${employeeNumber}|${documentTypeId}` : undefined
  const isExistingInDb = naturalKey ? existingKeys.has(naturalKey) : false

  const fingerprint = rowFingerprint(employeeNumber, raw["Document"])
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data = {
    employeeId: employeeNumber,
    documentTypeId,
    status: normalizeEnum(raw["Status"], STATUS_VALUES),
    uploadedAt: parseFlexibleDate(raw["Submission Date"]),
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : isExistingInDb ? "updated" : "new"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient, _ctx: ImportContext, importedById: string) {
  const data = row.data as { employeeId: string; documentTypeId: string; status: string; uploadedAt?: Date }

  await tx.onboardingDocumentAssignment.upsert({
    where: { employeeId_documentTypeId: { employeeId: data.employeeId, documentTypeId: data.documentTypeId } },
    create: {
      employeeId: data.employeeId,
      documentTypeId: data.documentTypeId,
      status: data.status as never,
      uploadedAt: data.uploadedAt,
      assignedById: importedById,
    },
    update: {
      status: data.status as never,
      uploadedAt: data.uploadedAt,
    },
  })

  return { action: row.status === "new" ? ("created" as const) : ("updated" as const), employeeNumber: data.employeeId }
}

export const onboardingDocumentsImportConfig: ImportModuleConfig = {
  key: "onboarding-documents",
  label: "Onboarding Documents",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "compositeKeyUpdate",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
