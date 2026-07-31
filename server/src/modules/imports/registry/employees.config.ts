import { ContractType, Gender, MaritalStatus } from "@prisma/client"

import type { ImportContext, ImportDeps, ImportModuleConfig, ImportRowResult, ImportTemplateColumn } from "./types"
import {
  isBlank,
  normalizeEnum,
  normalizeNumber,
  normalizeString,
  parseFlexibleDate,
  requireField,
  rowFingerprint,
  validateDate,
  validateEmail,
  validateEnum,
  validateNumber,
  validatePhone,
} from "../validators.util"

const GENDER_VALUES = Object.values(Gender)
const MARITAL_STATUS_VALUES = Object.values(MaritalStatus)
const CONTRACT_TYPE_VALUES = Object.values(ContractType)
const STATUS_VALUES = ["ACTIVE", "EXIT"] as const

const COLUMNS: ImportTemplateColumn[] = [
  { key: "employeeNumber", header: "Employee Number", required: false, example: "", description: "Leave blank to create a new employee. Provide an existing number to update that employee." },
  { key: "firstName", header: "First Name", required: true, example: "Aline" },
  { key: "middleName", header: "Middle Name", required: false, example: "" },
  { key: "lastName", header: "Last Name", required: true, example: "Uwase" },
  { key: "gender", header: "Gender", required: true, example: "FEMALE", description: GENDER_VALUES.join(" | ") },
  { key: "dateOfBirth", header: "Date of Birth", required: true, example: "1994-05-12" },
  { key: "nationalId", header: "National ID", required: true, example: "1199480012345678" },
  { key: "passport", header: "Passport", required: false, example: "" },
  { key: "email", header: "Email", required: true, example: "aline.uwase@ncbagroup.com" },
  { key: "phone", header: "Phone", required: true, example: "+250788123456" },
  { key: "nationality", header: "Nationality", required: true, example: "Rwandan" },
  { key: "maritalStatus", header: "Marital Status", required: true, example: "SINGLE", description: MARITAL_STATUS_VALUES.join(" | ") },
  { key: "branch", header: "Branch", required: true, example: "Headquarters" },
  { key: "function", header: "Function", required: false, example: "Retail Banking", description: "Required if Department is set." },
  { key: "department", header: "Department", required: false, example: "Human Resources" },
  { key: "position", header: "Position", required: false, example: "HR Officer" },
  { key: "employmentType", header: "Employment Type", required: false, example: "PERMANENT", description: CONTRACT_TYPE_VALUES.join(" | ") },
  { key: "grade", header: "Grade", required: false, example: "Band 5" },
  { key: "joinedDate", header: "Joined Date", required: false, example: "2022-01-10" },
  { key: "confirmationDate", header: "Confirmation Date", required: false, example: "2022-04-10" },
  { key: "lineManager", header: "Line Manager (Employee Number)", required: false, example: "EMP-0001" },
  { key: "bankingExperiencePrevious", header: "Banking Experience (Previous)", required: false, example: "3" },
  { key: "bankingExperienceCurrent", header: "Banking Experience (Current)", required: false, example: "", description: "Read-only — automatically calculated from Joined Date. Any value entered here is ignored." },
  { key: "status", header: "Status", required: false, example: "ACTIVE", description: "Informational only. Use the Exit Management import to record an employee's exit." },
  { key: "emergencyContact", header: "Emergency Contact", required: false, example: "Jean Uwase +250788000000" },
  { key: "address", header: "Address", required: false, example: "KG 7 Ave, Kigali" },
]

interface LookupRow {
  id: string
  name: string
}

async function buildContext(deps: ImportDeps): Promise<ImportContext> {
  const { prisma } = deps
  const [branches, functions, departments, positions, bands, employees] = await Promise.all([
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.function.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true, functionId: true } }),
    prisma.position.findMany({ select: { id: true, title: true, departmentId: true } }),
    prisma.band.findMany({ select: { id: true, name: true } }),
    prisma.employee.findMany({ select: { employeeNumber: true } }),
  ])

  const maxEmployeeNumber = employees.reduce((max, employee) => {
    const match = /^EMP-(\d+)$/.exec(employee.employeeNumber)
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)

  return {
    branches,
    functions,
    departments,
    positions,
    bands,
    existingEmployeeNumbers: new Set(employees.map((employee) => employee.employeeNumber)),
    // Mutable — incremented as new-employee rows are validated, so two new
    // rows in the same file never collide on the same preview-assigned number.
    nextEmployeeNumberCounter: { value: maxEmployeeNumber },
  }
}

function findByName<T extends LookupRow>(list: T[], name: string): T | undefined {
  return list.find((item) => item.name.toLowerCase() === name.toLowerCase())
}

function validateRow(raw: Record<string, string>, rowNumber: number, ctx: ImportContext, seen: Set<string>): ImportRowResult {
  const errors: string[] = []
  const branches = ctx.branches as LookupRow[]
  const functions = ctx.functions as LookupRow[]
  const departments = ctx.departments as (LookupRow & { functionId: string })[]
  const positions = ctx.positions as { id: string; title: string; departmentId: string }[]
  const bands = ctx.bands as LookupRow[]
  const existingEmployeeNumbers = ctx.existingEmployeeNumbers as Set<string>
  const counter = ctx.nextEmployeeNumberCounter as { value: number }

  const employeeNumberRaw = normalizeString(raw["Employee Number"])
  const isUpdate = !isBlank(employeeNumberRaw)

  if (isUpdate && employeeNumberRaw && !existingEmployeeNumbers.has(employeeNumberRaw)) {
    errors.push(`Employee Number "${employeeNumberRaw}" does not correspond to an existing employee — leave this column blank to create a new employee instead.`)
  }

  for (const [label, field] of [
    ["First Name", "firstName"],
    ["Last Name", "lastName"],
    ["Gender", "gender"],
    ["Date of Birth", "dateOfBirth"],
    ["National ID", "nationalId"],
    ["Email", "email"],
    ["Phone", "phone"],
    ["Nationality", "nationality"],
    ["Marital Status", "maritalStatus"],
    ["Branch", "branch"],
  ] as const) {
    const error = requireField(raw[label], label)
    if (error) errors.push(error)
  }

  const emailError = validateEmail(raw["Email"])
  if (emailError) errors.push(emailError)
  const phoneError = validatePhone(raw["Phone"])
  if (phoneError) errors.push(phoneError)
  const dobError = validateDate(raw["Date of Birth"], "Date of Birth")
  if (dobError) errors.push(dobError)
  const genderError = validateEnum(raw["Gender"], "Gender", GENDER_VALUES)
  if (genderError) errors.push(genderError)
  const maritalError = validateEnum(raw["Marital Status"], "Marital Status", MARITAL_STATUS_VALUES)
  if (maritalError) errors.push(maritalError)
  if (!isBlank(raw["Employment Type"])) {
    const error = validateEnum(raw["Employment Type"], "Employment Type", CONTRACT_TYPE_VALUES)
    if (error) errors.push(error)
  }
  if (!isBlank(raw["Status"])) {
    const error = validateEnum(raw["Status"], "Status", STATUS_VALUES)
    if (error) errors.push(error)
  }
  for (const [label, field] of [
    ["Joined Date", "Joined Date"],
    ["Confirmation Date", "Confirmation Date"],
  ] as const) {
    const error = validateDate(raw[label], label)
    if (error) errors.push(error)
  }
  const experienceError = validateNumber(raw["Banking Experience (Previous)"], "Banking Experience (Previous)", { min: 0, max: 60 })
  if (experienceError) errors.push(experienceError)

  const branch = findByName(branches, raw["Branch"] ?? "")
  if (!isBlank(raw["Branch"]) && !branch) errors.push(`Branch "${raw["Branch"]}" does not exist.`)

  let departmentId: string | undefined
  if (!isBlank(raw["Department"])) {
    if (isBlank(raw["Function"])) {
      errors.push("Function is required when Department is set.")
    } else {
      const fn = findByName(functions, raw["Function"])
      if (!fn) {
        errors.push(`Function "${raw["Function"]}" does not exist.`)
      } else {
        const department = departments.find((d) => d.functionId === fn.id && d.name.toLowerCase() === raw["Department"].toLowerCase())
        if (!department) {
          errors.push(`Department "${raw["Department"]}" does not exist under Function "${raw["Function"]}".`)
        } else {
          departmentId = department.id
        }
      }
    }
  }

  let positionId: string | undefined
  if (!isBlank(raw["Position"])) {
    if (!departmentId) {
      errors.push("Department (and Function) must be set to resolve Position.")
    } else {
      const candidates = positions.filter((p) => p.departmentId === departmentId && p.title.toLowerCase() === raw["Position"].toLowerCase())
      if (candidates.length === 0) {
        errors.push(`Position "${raw["Position"]}" does not exist in Department "${raw["Department"]}".`)
      } else if (candidates.length > 1) {
        errors.push(`Position "${raw["Position"]}" is ambiguous within Department "${raw["Department"]}" (exists in multiple units) — rename one of them to disambiguate.`)
      } else {
        positionId = candidates[0].id
      }
    }
  }

  let bandId: string | undefined
  if (!isBlank(raw["Grade"])) {
    const band = findByName(bands, raw["Grade"])
    if (!band) errors.push(`Grade "${raw["Grade"]}" does not exist.`)
    else bandId = band.id
  }

  if (!isBlank(raw["Position"]) && isBlank(raw["Grade"])) {
    errors.push("Grade is required when Position is set (Employee.bandId cannot be assigned without a Band).")
  }

  let lineManagerId: string | undefined
  if (!isBlank(raw["Line Manager (Employee Number)"])) {
    const candidate = raw["Line Manager (Employee Number)"].trim()
    if (!existingEmployeeNumbers.has(candidate)) {
      errors.push(`Line Manager "${candidate}" does not correspond to an existing employee. (Managers must already exist — they can't be another new row in this same file.)`)
    } else {
      lineManagerId = candidate
    }
  }

  const fingerprint = rowFingerprint(employeeNumberRaw ?? "", raw["National ID"], raw["Email"])
  const isDuplicateInFile = seen.has(fingerprint)
  seen.add(fingerprint)

  const data: Record<string, unknown> = {
    employeeNumber: employeeNumberRaw,
    firstName: normalizeString(raw["First Name"]),
    middleName: normalizeString(raw["Middle Name"]),
    lastName: normalizeString(raw["Last Name"]),
    gender: normalizeEnum(raw["Gender"], GENDER_VALUES),
    dateOfBirth: parseFlexibleDate(raw["Date of Birth"]),
    nationalIdNumber: normalizeString(raw["National ID"]),
    passportNumber: normalizeString(raw["Passport"]),
    email: normalizeString(raw["Email"]),
    phone: normalizeString(raw["Phone"]),
    nationality: normalizeString(raw["Nationality"]),
    maritalStatus: normalizeEnum(raw["Marital Status"], MARITAL_STATUS_VALUES),
    branchId: branch?.id,
    departmentId,
    positionId,
    contractType: normalizeEnum(raw["Employment Type"], CONTRACT_TYPE_VALUES),
    bandId,
    employmentStartDate: parseFlexibleDate(raw["Joined Date"]),
    probationEndDate: parseFlexibleDate(raw["Confirmation Date"]),
    reportingManagerOverrideId: lineManagerId,
    previousBankingExperienceYears: normalizeNumber(raw["Banking Experience (Previous)"]),
    emergencyContact: normalizeString(raw["Emergency Contact"]),
    address: normalizeString(raw["Address"]),
  }

  let status: ImportRowResult["status"] = errors.length > 0 ? "invalid" : isDuplicateInFile ? "duplicate" : isUpdate ? "updated" : "new"

  // Preview-assign the next EMP-#### number for new, otherwise-valid rows so
  // the preview table can show a real value instead of "(auto)" — commit()
  // re-derives this the same deterministic way, so it stays correct even if
  // another job's rows are committed in between preview and this job's commit.
  if (status === "new") {
    counter.value += 1
    data.employeeNumber = `EMP-${String(counter.value).padStart(4, "0")}`
  }

  return { row: rowNumber, status, employeeNumber: (data.employeeNumber as string | undefined) ?? employeeNumberRaw, data, errors }
}

async function applyRow(row: ImportRowResult, _tx: unknown, _ctx: ImportContext, importedById: string, deps: ImportDeps) {
  // Deliberately ignores the shared commit transaction (`_tx`) — see
  // ImportDeps' doc comment in registry/types.ts. EmployeesService.create /
  // updateEmploymentDetails / assignPosition each carry essential side
  // effects (position history rows, leave balance provisioning, auto-hire
  // training assignment) that a raw prisma write would silently skip, and
  // those methods manage their own internal transactions. The tradeoff: an
  // Employee-module import isn't one single all-or-nothing transaction
  // across every row — each row is independently valid and recorded in
  // rowResults, the same left-to-right, best-effort semantics as the
  // registration wizard itself (which never wraps its 5 steps in one
  // cross-step transaction either).
  const { employeesService } = deps
  const data = row.data

  let employeeNumber: string
  let isNewEmployee: boolean

  if (row.status === "new") {
    const created = await employeesService.create({
      firstName: data.firstName as string,
      middleName: data.middleName as string | undefined,
      lastName: data.lastName as string,
      gender: data.gender as never,
      dateOfBirth: data.dateOfBirth as Date,
      nationalIdNumber: data.nationalIdNumber as string,
      passportNumber: data.passportNumber as string | undefined,
      nationality: data.nationality as string,
      maritalStatus: data.maritalStatus as never,
      email: data.email as string,
      phone: data.phone as string,
      branchId: data.branchId as string,
      address: data.address as string | undefined,
      emergencyContact: data.emergencyContact as string | undefined,
      reportingManagerOverrideId: data.reportingManagerOverrideId as string | undefined,
    } as never)
    employeeNumber = created.employeeNumber
    isNewEmployee = true
  } else {
    employeeNumber = row.employeeNumber as string
    isNewEmployee = false
    await employeesService.update(employeeNumber, {
      firstName: data.firstName as string,
      middleName: data.middleName as string | undefined,
      lastName: data.lastName as string,
      gender: data.gender as never,
      dateOfBirth: data.dateOfBirth as Date,
      nationalIdNumber: data.nationalIdNumber as string,
      passportNumber: data.passportNumber as string | undefined,
      nationality: data.nationality as string,
      maritalStatus: data.maritalStatus as never,
      email: data.email as string,
      phone: data.phone as string,
      branchId: data.branchId as string,
      address: data.address as string | undefined,
      emergencyContact: data.emergencyContact as string | undefined,
      reportingManagerOverrideId: data.reportingManagerOverrideId as string | undefined,
    } as never)
  }

  if (data.contractType || data.employmentStartDate || data.probationEndDate || data.previousBankingExperienceYears !== undefined) {
    await employeesService.updateEmploymentDetails(employeeNumber, {
      contractType: data.contractType as never,
      employmentStartDate: data.employmentStartDate as Date | undefined,
      probationEndDate: data.probationEndDate as Date | undefined,
      previousBankingExperienceYears: data.previousBankingExperienceYears as number | undefined,
    } as never)
  }

  if (data.positionId && data.bandId) {
    await employeesService.assignPosition(employeeNumber, {
      positionId: data.positionId as string,
      bandId: data.bandId as string,
      effectiveFrom: (data.employmentStartDate as Date | undefined) ?? new Date(),
      reportingManagerOverrideId: data.reportingManagerOverrideId as string | undefined,
    } as never)
  }

  void importedById // no direct write needs the importer's id for this module
  return { action: isNewEmployee ? ("created" as const) : ("updated" as const), employeeNumber }
}

export const employeesImportConfig: ImportModuleConfig = {
  key: "employees",
  label: "Employees",
  referenceKeyLabel: "Employee Number",
  matchStrategy: "employeeNumberUpdate",
  usesTransaction: false,
  columns: COLUMNS,
  buildContext,
  validateRow,
  applyRow: applyRow as ImportModuleConfig["applyRow"],
}
