import { createHash } from "node:crypto"

import { Injectable } from "@nestjs/common"
import type { EducationType, Prisma } from "@prisma/client"

import { buildCsv } from "../imports/spreadsheet.util"
import { EDUCATION_TYPE_TO_BNR_CODE } from "./edwh-codes"
import { PrismaService } from "../../prisma/prisma.service"

/**
 * BNR/EDWH regulatory submission — a fixed-column CSV of every employee,
 * one row each. Column order below is the exact order BNR's EDWH template
 * expects; do not reorder without checking the spec again.
 *
 * Several columns have no real source of data anywhere in this app yet
 * (VISION_OUC and PREVIOUS_EMPLOYER — an external employer, distinct from
 * Employee.previousDepartment/previousPositionHeld which only track an
 * earlier *internal* stint before a rehire).
 * Those are emitted as empty strings rather than invented, so HR can see
 * exactly what's missing per employee rather than silently filling
 * plausible but wrong values. If these become trackable later (new
 * Employee fields), wire them in here.
 *
 * BNR_APPROVAL_REQD/DATE_OF_BNR_APPROVAL ARE trackable — HR sets them
 * directly on an employee's profile (Employee.bnrApprovalRequired/
 * bnrApprovalDate, edited via the employment-details endpoint), typically
 * only for the senior grades BNR cares about (see GRADE_CODE below), but
 * nothing stops setting it on anyone. Both blank until HR fills them in.
 */
export const EDWH_REPORT_HEADERS = [
  "COUNTRY",
  "LE_BOOK",
  "YEAR_MONTH",
  "STAFF_ID",
  "STAFF_NAME",
  "VISION_OUC",
  "DEPARTMENT_ID",
  "STAFF_GENDER",
  "NATIONALITY",
  "ID_TYPE",
  "ID_NUMBER",
  "DATE_OF_BIRTH",
  "ROLE_CODE",
  "GRADE_CODE",
  "EDUCATION",
  "PROFESSIONAL_CERTIFICATES",
  "TELEPHONE",
  "EMAIL_ID",
  "DATE_OF_EMPLOYMENT",
  "STAFF_STATUS",
  "DATE_OF_EXIT",
  "REASON_FOR_EXIT",
  "BNR_APPROVAL_REQD",
  "DATE_OF_BNR_APPROVAL",
  "PREVIOUS_EMPLOYER",
  "AREA_OF_SPECIALISATION",
]

const YEAR_MONTH_INDEX = EDWH_REPORT_HEADERS.indexOf("YEAR_MONTH")

/** ID_TYPE code table from the EDWH spec. */
const ID_TYPE = {
  DRIVING_LICENSE: 1,
  NATIONAL_ID: 2,
  REFUGEE_ID: 3,
  PASSPORT: 4,
  FOREIGNERS_ID: 5,
  REGISTRATION_NUMBER: 6,
} as const

/** STAFF_STATUS code table from the EDWH spec. Code 9 ("Delete") has no
 *  equivalent in this app — Employee rows are never hard-deleted (see
 *  EmployeesService), so it's never emitted. */
const STAFF_STATUS = {
  ACTIVE: 0,
  INACTIVE: 1,
} as const

/** LE_BOOK is a fixed constant for every employee/branch in this
 *  institution, per HR — not a per-branch value. */
const LE_BOOK = "035"

/** COUNTRY is derived from the employee's free-text Employee.nationality
 *  field (there's no fixed dropdown — see employee-form.tsx), mapped to the
 *  ISO-ish country codes BNR expects. Matching is case-insensitive and
 *  tolerant of the common spellings/demonyms HR actually types in
 *  (Rwandan/Rwanda, Kenyan/Kenya, Ugandan/Uganda, Tanzanian/Tanzania).
 *  Anything unrecognized falls back to "" rather than guessing wrong. */
const NATIONALITY_TO_COUNTRY: Record<string, string> = {
  rwanda: "RW",
  rwandan: "RW",
  rw: "RW",
  kenya: "KE",
  kenyan: "KE",
  ke: "KE",
  uganda: "UG",
  ugandan: "UG",
  ug: "UG",
  tanzania: "TZ",
  tanzanian: "TZ",
  tz: "TZ",
}

function nationalityToCountry(nationality: string | null | undefined): string {
  if (!nationality) return ""
  const key = nationality.trim().toLowerCase()
  return NATIONALITY_TO_COUNTRY[key] ?? ""
}

/** EDUCATION: the BNR Education Code (1 PHD ... 8 Below Primary) of the
 *  employee's highest qualification. Each education record carries a code
 *  picked by the user (bnrEducationCode); records without one fall back to
 *  the closest code for their EducationType (see edwh-codes.ts). Lower code
 *  = higher education, so "highest" is the minimum. Blank when no record
 *  maps to a code. */
function highestEducationCode(records: { type: EducationType; bnrEducationCode: number | null }[]): number | "" {
  const codes = records
    .map((r) => r.bnrEducationCode ?? EDUCATION_TYPE_TO_BNR_CODE[r.type])
    .filter((c): c is number => typeof c === "number")
  return codes.length > 0 ? Math.min(...codes) : ""
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return ""
  return value.toISOString().slice(0, 10)
}

/** GRADE_CODE groups the bank's 10-level PositionLevel ladder (see
 *  prisma/seed.ts) into the 4 bands HR reports to BNR, keyed by level
 *  name (case-insensitive):
 *  A — Director, Deputy Director
 *  B — General Manager (the department-head level)
 *  C — Senior Manager, Manager, Assistant General Manager
 *  D — Assistant Manager, Officer, Operations Assistant, Support Staff
 *  Per HR's explicit instruction, Assistant Manager sits in D (with
 *  Officer and below), not alongside Manager/Senior Manager. A level not
 *  in this table (new ladder additions) falls back to "". */
const LEVEL_NAME_TO_GRADE_CODE: Record<string, string> = {
  director: "A",
  "deputy director": "A",
  "general manager": "B",
  "senior manager": "C",
  manager: "C",
  "assistant general manager": "C",
  "assistant manager": "D",
  officer: "D",
  "operations assistant": "D",
  "support staff": "D",
}

function levelToGradeCode(levelName: string | null | undefined): string {
  if (!levelName) return ""
  return LEVEL_NAME_TO_GRADE_CODE[levelName.trim().toLowerCase()] ?? ""
}

const EDWH_EMPLOYEE_INCLUDE = {
  position: { include: { department: true, level: true } },
  education: { select: { type: true, bnrEducationCode: true } },
  certifications: { select: { bnrCertificateCode: true } },
} as const

type EdwhEmployee = Prisma.EmployeeGetPayload<{ include: typeof EDWH_EMPLOYEE_INCLUDE }>

@Injectable()
export class EdwhReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * YEAR_MONTH is per employee: the month their EDWH row last changed, not
   * the reporting month picked in the UI. Changes are detected by hashing
   * each employee's freshly built row (everything except YEAR_MONTH) and
   * comparing it to the hash stored on the employee at the previous export:
   * - no stored hash yet (first export): baseline = the selected reporting
   *   month;
   * - hash differs (any EDWH field changed — profile, position, education,
   *   certificates, exit, BNR approval, ... — via any code path, including
   *   bulk imports): YEAR_MONTH becomes the current calendar month and is
   *   stored;
   * - hash unchanged: the stored YEAR_MONTH is reused, so re-exporting is
   *   stable.
   * This means the export has a small write side effect (it persists the
   * hash/month for new or changed employees).
   */
  async generateCsv(reportingMonth: string): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      include: EDWH_EMPLOYEE_INCLUDE,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })

    const now = new Date()
    const currentMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
    const updates: Prisma.PrismaPromise<unknown>[] = []

    const rows = employees.map((employee) => {
      const row = this.buildRow(employee, "")
      const hash = createHash("sha256").update(JSON.stringify(row)).digest("hex")

      let yearMonth = employee.edwhYearMonth
      if (!employee.edwhRowHash || !yearMonth) {
        yearMonth = reportingMonth
      } else if (employee.edwhRowHash !== hash) {
        yearMonth = currentMonth
      }

      if (hash !== employee.edwhRowHash || yearMonth !== employee.edwhYearMonth) {
        updates.push(
          this.prisma.employee.update({
            where: { employeeNumber: employee.employeeNumber },
            data: { edwhRowHash: hash, edwhYearMonth: yearMonth },
            select: { employeeNumber: true },
          })
        )
      }

      row[YEAR_MONTH_INDEX] = yearMonth
      return row
    })

    // Chunked so a first export of a large workforce doesn't open one huge transaction.
    for (let i = 0; i < updates.length; i += 200) {
      await this.prisma.$transaction(updates.slice(i, i + 200))
    }

    return buildCsv(EDWH_REPORT_HEADERS, rows)
  }

  private buildRow(employee: EdwhEmployee, yearMonth: string): (string | number)[] {
    const staffName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ")

    // National ID is required for every employee in this system regardless
    // of nationality (Employee.nationalIdNumber is non-optional), so it's
    // the safe default; a foreign national with a passport on file is
    // reported against that instead, matching the code table's intent
    // ("National ID — mandatory for Rwandan nationals").
    const [idType, idNumber] = employee.passportNumber
      ? [ID_TYPE.PASSPORT, employee.passportNumber]
      : [ID_TYPE.NATIONAL_ID, employee.nationalIdNumber]

    // Distinct BNR certificate codes, in entry order; certifications the user
    // didn't tag with a BNR code are skipped (nothing valid to report).
    const certificates = [
      ...new Set(
        employee.certifications.map((c) => c.bnrCertificateCode).filter((c): c is string => Boolean(c))
      ),
    ].join(";")

    return [
      nationalityToCountry(employee.nationality),
      LE_BOOK,
      yearMonth,
      employee.employeeNumber,
      staffName,
      "", // VISION_OUC — no source field yet
      employee.position?.department?.code ?? "",
      employee.gender,
      employee.nationality,
      idType,
      idNumber,
      formatDate(employee.dateOfBirth),
      employee.position?.code ?? "",
      levelToGradeCode(employee.position?.level?.name),
      highestEducationCode(employee.education),
      certificates,
      employee.phone,
      employee.email,
      formatDate(employee.employmentStartDate),
      employee.employmentStatus === "ACTIVE" ? STAFF_STATUS.ACTIVE : STAFF_STATUS.INACTIVE,
      formatDate(employee.exitDate),
      employee.exitReason ?? "",
      employee.bnrApprovalRequired === null || employee.bnrApprovalRequired === undefined
        ? ""
        : employee.bnrApprovalRequired
          ? "Y"
          : "N",
      formatDate(employee.bnrApprovalDate),
      "", // PREVIOUS_EMPLOYER — no source field yet (previousDepartment/previousPositionHeld track an internal rehire, not an external employer)
      employee.areaOfSpecialisation ?? "",
    ]
  }
}
