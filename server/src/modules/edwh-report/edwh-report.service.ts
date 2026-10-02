import { Injectable } from "@nestjs/common"
import type { EducationType, Prisma } from "@prisma/client"

import { buildCsv } from "../imports/spreadsheet.util"
import { PrismaService } from "../../prisma/prisma.service"

/**
 * BNR/EDWH regulatory submission — a fixed-column CSV of every employee,
 * one row each. Column order below is the exact order BNR's EDWH template
 * expects; do not reorder without checking the spec again.
 *
 * Several columns have no real source of data anywhere in this app yet
 * (VISION_OUC, BNR_APPROVAL_REQD, DATE_OF_BNR_APPROVAL, PREVIOUS_EMPLOYER —
 * an external employer, distinct from Employee.previousDepartment/
 * previousPositionHeld which only track an earlier *internal* stint before
 * a rehire — and AREA_OF_SPECIALISATION). Those are emitted as empty
 * strings rather than invented, so HR can see exactly what's missing per
 * employee rather than silently filling plausible but wrong values. If
 * these become trackable later (new Employee fields), wire them in here.
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

/** Ranks EducationType so "highest" qualification can be picked out of an
 *  employee's full EmployeeEducation history — higher number wins. Mirrors
 *  the real-world hierarchy (a Master's outranks a Diploma, etc.); types
 *  that aren't a formal qualification (TRAINING/COURSE/WORKSHOP/
 *  SHORT_COURSE) rank lowest so a one-off training session never shadows an
 *  actual degree on record. */
const EDUCATION_RANK: Record<EducationType, number> = {
  PHD: 7,
  MASTERS_DEGREE: 6,
  DEGREE: 5,
  PROFESSIONAL_CERTIFICATION: 4,
  DIPLOMA: 3,
  CERTIFICATE: 2,
  SECONDARY_SCHOOL: 1,
  SHORT_COURSE: 0,
  TRAINING: 0,
  COURSE: 0,
  WORKSHOP: 0,
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
  education: { select: { type: true, title: true } },
  certifications: { select: { name: true } },
} as const

type EdwhEmployee = Prisma.EmployeeGetPayload<{ include: typeof EDWH_EMPLOYEE_INCLUDE }>

@Injectable()
export class EdwhReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateCsv(yearMonth: string): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      include: EDWH_EMPLOYEE_INCLUDE,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })

    const rows = employees.map((employee) => this.buildRow(employee, yearMonth))
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

    const highestEducation = [...employee.education].sort(
      (a, b) => EDUCATION_RANK[b.type] - EDUCATION_RANK[a.type]
    )[0]

    const certificates = employee.certifications.map((c) => c.name).join("; ")

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
      highestEducation?.title ?? "",
      certificates,
      employee.phone,
      employee.email,
      formatDate(employee.employmentStartDate),
      employee.employmentStatus === "ACTIVE" ? STAFF_STATUS.ACTIVE : STAFF_STATUS.INACTIVE,
      formatDate(employee.exitDate),
      employee.exitReason ?? "",
      "", // BNR_APPROVAL_REQD — no source field yet
      "", // DATE_OF_BNR_APPROVAL — no source field yet
      "", // PREVIOUS_EMPLOYER — no source field yet (previousDepartment/previousPositionHeld track an internal rehire, not an external employer)
      "", // AREA_OF_SPECIALISATION — no source field yet
    ]
  }
}
