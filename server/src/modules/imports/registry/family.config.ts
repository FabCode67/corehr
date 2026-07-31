import { FamilyRelationship, type Prisma } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import { normalizeEnum, normalizeString, parseFlexibleDate, requireField, rowFingerprint, validateDate, validateEnum } from "../validators.util"

const RELATIONSHIP_VALUES = Object.values(FamilyRelationship)

const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: true, example: "EMP-0001" },
  { key: "name", header: "Name", required: true, example: "Jean Uwase" },
  { key: "relationship", header: "Relationship", required: true, example: "SPOUSE", description: RELATIONSHIP_VALUES.join(" | ") },
  { key: "dateOfBirth", header: "Date of Birth", required: false, example: "1990-03-20" },
  { key: "occupation", header: "Occupation", required: false, example: "Teacher" },
  { key: "contactNumber", header: "Contact Number", required: false, example: "+250788000000" },
]

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const employees = await deps.prisma.employee.findMany({ select: { employeeNumber: true } })
  return { existingEmployeeNumbers: new Set(employees.map((e) => e.employeeNumber)) }
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>

  for (const label of ["Employee Number", "Name", "Relationship"]) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const employeeNumber = normalizeString(raw["Employee Number"])
  if (employeeNumber && !existingEmployeeNumbers.has(employeeNumber)) {
    errors.push(`Employee Number "${employeeNumber}" does not correspond to an existing employee.`)
  }

  const relationshipError = validateEnum(raw["Relationship"], "Relationship", RELATIONSHIP_VALUES)
  if (relationshipError) errors.push(relationshipError)

  const dobError = validateDate(raw["Date of Birth"], "Date of Birth")
  if (dobError) errors.push(dobError)

  const fingerprint = rowFingerprint(employeeNumber, raw["Name"], raw["Relationship"])
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data = {
    employeeId: employeeNumber,
    name: normalizeString(raw["Name"]),
    relationship: normalizeEnum(raw["Relationship"], RELATIONSHIP_VALUES),
    dateOfBirth: parseFlexibleDate(raw["Date of Birth"]),
    occupation: normalizeString(raw["Occupation"]),
    contactNumber: normalizeString(raw["Contact Number"]),
  }

  const status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : "new"
  return { row: rowNumber, status, employeeNumber, data, errors }
}

async function applyRow(row: ImportRowResult, tx: Prisma.TransactionClient) {
  const data = row.data as { employeeId: string; name: string; relationship: string; dateOfBirth?: Date; occupation?: string; contactNumber?: string }
  await tx.employeeFamilyMember.create({
    data: {
      employeeId: data.employeeId,
      name: data.name,
      relationship: data.relationship as never,
      dateOfBirth: data.dateOfBirth,
      occupation: data.occupation,
      contactNumber: data.contactNumber,
    },
  })
  return { action: "created" as const, employeeNumber: data.employeeId }
}

export const familyImportConfig: ImportModuleConfig = {
  key: "family",
  label: "Family Members",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "insertOnly",
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow,
}
