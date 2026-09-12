/**
 * ONE-OFF TEST DATA SEEDER — NOT part of `npx prisma db seed`.
 *
 * `prisma/seed.ts` stays the minimal, production-style seed (3 Functions,
 * your Human Resources / Executive Office departments, the one HR-head
 * employee, and the handful of reference catalogs nothing else can create).
 * This file is separate on purpose, so resetting the database
 * (`npx prisma migrate reset`) or re-running `npx prisma db seed` never
 * drags demo data back in.
 *
 * Run this yourself, whenever you want data to click around in:
 *
 *     npx ts-node prisma/seed-test-data.ts
 *
 * It builds ON TOP of whatever already exists in your database:
 *  - 5 branches (Kigali Heights, Remera, Nyabugogo, Gisozi, Rusizi)
 *  - Looks up your existing Human Resources / Executive Office / IT
 *    departments (by name — see findDepartment()'s candidate lists below;
 *    edit those if your IT department is named something the script
 *    doesn't recognize) and, under each, a 10-person management ladder
 *    (Senior Manager down to Operations Assistant) reporting up to that
 *    department's existing head position
 *  - Fills the Director-level position under Executive Office with an
 *    employee, if one exists and is currently vacant
 *  - A Leave Type catalog (Annual/Sick/Maternity/Paternity/Compassionate/
 *    Study) with approval steps, Annual Leave entitlement rules, and a
 *    carry-forward policy, then 2 leave requests per new employee spread
 *    across FY2025 (historical, approved) and FY2026 (a mix of
 *    submitted/pending/approved/rejected/cancelled, so every status shows
 *    up somewhere)
 *  - Two performance review periods (FY2025 closed, FY2026 mid-year open)
 *    with a finalized FY2025 review and an in-progress FY2026 review for
 *    every new employee
 *
 * Positions and branches upsert by natural key, so re-running is safe for
 * those. Employees, leave requests, and performance reviews are NOT
 * de-duplicated — re-running adds another batch on top. That's expected
 * for a test-data script; if you want a clean slate, reset the database
 * and re-run `npx prisma db seed` (the real seed) first.
 */
import {
  ApprovalDecision,
  ApprovalRole,
  ContractType,
  Gender,
  LeaveCategory,
  LeaveEntitlementCategory,
  LeaveRequestStatus,
  MaritalStatus,
  PerformanceCycleStatus,
  PerformanceReviewStatus,
  PerformanceReviewType,
  PositionChangeType,
  PrismaClient,
} from "@prisma/client"
import * as bcrypt from "bcryptjs"

import { computeIsAdminForPosition } from "../src/common/admin-eligibility.util"
import { DEFAULT_EMPLOYEE_PASSWORD } from "../src/modules/auth/default-password.constant"

const prisma = new PrismaClient()

// ---- date helpers (same conventions prisma/seed.ts used) ------------------

function countWeekdays(start: Date, end: Date) {
  let count = 0
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}

function nextWeekday(after: Date) {
  const cursor = new Date(after)
  do {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  } while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6)
  return cursor
}

function toWeekday(date: Date) {
  const cursor = new Date(date)
  while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return cursor
}

/** Deterministic "different but spread out" date generator — no real
 *  randomness (keeps a re-run's output legible/debuggable), just enough
 *  variance across a seed index that dates don't all clump together. */
function dateFromSeed(seed: number, baseYear: number, yearSpan: number) {
  const year = baseYear + (seed % Math.max(yearSpan, 1))
  const month = (seed * 3) % 12
  const day = 1 + ((seed * 7) % 27)
  return new Date(Date.UTC(year, month, day))
}

function nationalId(seed: number) {
  const year = 1970 + (seed % 40)
  return `1${year}80${String(seed).padStart(8, "0")}`
}

function phoneNumber(seed: number) {
  return `+25078850${String(seed % 10000).padStart(4, "0")}`
}

// ---- small upsert helpers (mirroring prisma/seed.ts's patterns) -----------

async function upsertBranch(name: string, code: string, isHeadquarters = false) {
  const existingByCode = await prisma.branch.findUnique({ where: { code } }).catch(() => null)
  if (existingByCode) {
    return prisma.branch.update({ where: { id: existingByCode.id }, data: { name, isHeadquarters } })
  }
  const existingByName = await prisma.branch.findUnique({ where: { name } }).catch(() => null)
  if (existingByName) {
    return prisma.branch.update({ where: { id: existingByName.id }, data: { code, isHeadquarters } })
  }
  return prisma.branch.create({ data: { name, code, isHeadquarters } })
}

/** Tries each candidate name (exact, case-insensitive) first, then falls
 *  back to a substring match, before giving up with a clear error listing
 *  what departments actually exist — so a naming mismatch is easy to fix
 *  by editing the candidate list below rather than a cryptic Prisma error. */
async function findDepartment(label: string, candidates: string[]) {
  for (const name of candidates) {
    const dept = await prisma.department.findFirst({ where: { name: { equals: name, mode: "insensitive" as const } } })
    if (dept) return dept
  }
  for (const name of candidates) {
    const dept = await prisma.department.findFirst({ where: { name: { contains: name, mode: "insensitive" as const } } })
    if (dept) return dept
  }
  const all = await prisma.department.findMany({ select: { name: true } })
  throw new Error(
    `Could not find the "${label}" department (tried: ${candidates.join(", ")}). Existing departments: ${
      all.map((d) => d.name).join(", ") || "(none)"
    }. Edit the candidate names in seed-test-data.ts and re-run.`
  )
}

async function upsertPosition(params: {
  title: string
  departmentId: string
  levelId: string
  reportsToPositionId?: string | null
}) {
  const { title, departmentId, levelId, reportsToPositionId = null } = params
  const existing = await prisma.position.findFirst({ where: { departmentId, unitId: null, title } })
  if (existing) {
    return prisma.position.update({ where: { id: existing.id }, data: { levelId, reportsToPositionId } })
  }
  return prisma.position.create({ data: { title, departmentId, levelId, reportsToPositionId } })
}

/** Finds the department's existing head-of-department-level position (by
 *  PositionLevel.rank, not by guessing a title string), or creates one
 *  reporting to the bank's Director-level position (if any). */
async function ensureHeadPosition(
  departmentId: string,
  fallbackTitle: string,
  gmLevelId: string,
  directorPositionId: string | null
) {
  const existing = await prisma.position.findFirst({
    where: { departmentId, isActive: true, level: { rank: 8 } },
  })
  if (existing) return existing
  return prisma.position.create({
    data: { title: fallbackTitle, departmentId, levelId: gmLevelId, reportsToPositionId: directorPositionId },
  })
}

async function upsertEmployee(params: {
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  gender: Gender
  dateOfBirth: Date
  nationalIdNumber: string
  nationality: string
  maritalStatus: MaritalStatus
  phone: string
  branchId: string
  positionId: string
  bandId: string
  employmentStartDate: Date
  contractType: ContractType
}) {
  const { positionId, bandId, branchId, employmentStartDate, contractType, ...basics } = params

  const isAdmin = await computeIsAdminForPosition(prisma, positionId)
  const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10)

  const employee = await prisma.employee.upsert({
    where: { employeeNumber: params.employeeNumber },
    update: { positionId, bandId, branchId, employmentStartDate, contractType, passwordHash, isAdmin },
    create: { ...basics, positionId, bandId, branchId, employmentStartDate, contractType, passwordHash, isAdmin },
  })

  const hasHistory = await prisma.positionHistory.findFirst({ where: { employeeId: employee.employeeNumber } })
  if (!hasHistory) {
    await prisma.positionHistory.create({
      data: {
        employeeId: employee.employeeNumber,
        positionId,
        bandId,
        changeType: PositionChangeType.INITIAL_HIRE,
        effectiveFrom: employmentStartDate,
      },
    })
  }

  return employee
}

async function makeEmployeeNumberSeq() {
  const employees = await prisma.employee.findMany({ select: { employeeNumber: true } })
  let max = 0
  for (const employee of employees) {
    const match = /^EMP-(\d+)$/.exec(employee.employeeNumber)
    if (match) max = Math.max(max, parseInt(match[1], 10))
  }
  let counter = max
  return {
    next: () => {
      counter += 1
      return `EMP-${String(counter).padStart(4, "0")}`
    },
  }
}

// ---- name pool --------------------------------------------------------------

const MALE_FIRST_NAMES = [
  "Jean-Paul", "Eric", "Patrick", "Emmanuel", "Vincent", "Alexis", "Olivier", "Thierry",
  "Innocent", "Claude", "Bernard", "Etienne", "Pacifique", "Theogene", "Aime", "Gilbert",
]
const FEMALE_FIRST_NAMES = [
  "Claudine", "Solange", "Aline", "Marie", "Immaculee", "Beatrice", "Josiane", "Christine",
  "Diane", "Alice", "Grace", "Vestine", "Chantal", "Esperance", "Yvonne", "Delphine",
]
const LAST_NAMES = [
  "Uwimana", "Mugisha", "Ndayisenga", "Nkurunziza", "Habimana", "Niyonsenga", "Nsengimana",
  "Mukamana", "Iradukunda", "Ishimwe", "Uwase", "Gasana", "Rugamba", "Byiringiro", "Mutesi",
  "Kayitesi", "Twagirimana", "Nzabonimpa", "Ntawukuriryayo", "Umutoni", "Bizimana", "Mukandayisenga",
]

function buildNamePool() {
  const pool: { firstName: string; lastName: string; gender: Gender }[] = []
  MALE_FIRST_NAMES.forEach((firstName, i) => {
    pool.push({ firstName, lastName: LAST_NAMES[i % LAST_NAMES.length], gender: Gender.MALE })
  })
  FEMALE_FIRST_NAMES.forEach((firstName, i) => {
    pool.push({ firstName, lastName: LAST_NAMES[(i + 7) % LAST_NAMES.length], gender: Gender.FEMALE })
  })
  return pool
}

function makeNamePicker() {
  const pool = buildNamePool()
  let i = 0
  return () => pool[i++ % pool.length]
}

// ---- department ladder ------------------------------------------------------

interface RoleSpec {
  key: string
  levelName: string
  bandRank: number
  reportsToKey: string | null
}

const LADDER: RoleSpec[] = [
  { key: "srMgr", levelName: "Senior Manager", bandRank: 6, reportsToKey: "head" },
  { key: "mgrA", levelName: "Manager", bandRank: 5, reportsToKey: "srMgr" },
  { key: "mgrB", levelName: "Manager", bandRank: 5, reportsToKey: "srMgr" },
  { key: "amA", levelName: "Assistant Manager", bandRank: 4, reportsToKey: "mgrA" },
  { key: "amB", levelName: "Assistant Manager", bandRank: 4, reportsToKey: "mgrB" },
  { key: "offA1", levelName: "Officer", bandRank: 3, reportsToKey: "amA" },
  { key: "offA2", levelName: "Officer", bandRank: 3, reportsToKey: "amA" },
  { key: "offB1", levelName: "Officer", bandRank: 3, reportsToKey: "amB" },
  { key: "offB2", levelName: "Officer", bandRank: 3, reportsToKey: "amB" },
  { key: "opsAsst", levelName: "Operations Assistant", bandRank: 2, reportsToKey: "mgrA" },
]

const DEPARTMENT_TITLES: Record<string, Record<string, string>> = {
  hr: {
    srMgr: "Senior Manager – HR Operations",
    mgrA: "Manager – Learning & Development",
    mgrB: "Manager – Payroll & Benefits",
    amA: "Assistant Manager – Recruitment",
    amB: "Assistant Manager – Employee Relations",
    offA1: "Officer – Recruitment",
    offA2: "Officer – HR Data Analytics",
    offB1: "Officer – Payroll",
    offB2: "Officer – Employee Wellbeing",
    opsAsst: "Operations Assistant – HR",
  },
  it: {
    srMgr: "Senior Manager – Infrastructure",
    mgrA: "Manager – Systems & Support",
    mgrB: "Manager – Applications",
    amA: "Assistant Manager – Network & Security",
    amB: "Assistant Manager – Helpdesk",
    offA1: "Officer – Systems Analyst",
    offA2: "Officer – Network Analyst",
    offB1: "Officer – Applications Analyst",
    offB2: "Officer – Helpdesk Support",
    opsAsst: "Operations Assistant – IT",
  },
  exec: {
    srMgr: "Senior Manager – Corporate Affairs",
    mgrA: "Manager – Board & Governance",
    mgrB: "Manager – Strategy & Planning",
    amA: "Assistant Manager – Executive Support",
    amB: "Assistant Manager – Corporate Communications",
    offA1: "Officer – Executive Assistant",
    offA2: "Officer – Protocol & Events",
    offB1: "Officer – Corporate Communications",
    offB2: "Officer – Strategy Analyst",
    opsAsst: "Operations Assistant – Executive Office",
  },
}

async function buildDepartmentLadder(
  deptTag: "hr" | "it" | "exec",
  department: { id: string },
  headPositionId: string,
  levelsByName: Map<string, { id: string }>,
  bandsByRank: Map<number, { id: string }>,
  branches: { id: string }[],
  namePicker: () => { firstName: string; lastName: string; gender: Gender },
  employeeNumberSeq: { next: () => string },
  seedBase: number
) {
  const titles = DEPARTMENT_TITLES[deptTag]
  const positionIdByKey = new Map<string, string>([["head", headPositionId]])
  const created: string[] = []

  let seed = seedBase
  for (const spec of LADDER) {
    seed += 1
    const level = levelsByName.get(spec.levelName)
    const band = bandsByRank.get(spec.bandRank)
    if (!level || !band) {
      throw new Error(`Missing PositionLevel "${spec.levelName}" or Band ${spec.bandRank} — run \`npx prisma db seed\` first.`)
    }
    const reportsToPositionId = spec.reportsToKey ? positionIdByKey.get(spec.reportsToKey)! : null

    const position = await upsertPosition({
      title: titles[spec.key],
      departmentId: department.id,
      levelId: level.id,
      reportsToPositionId,
    })
    positionIdByKey.set(spec.key, position.id)

    const { firstName, lastName, gender } = namePicker()
    const employeeNumber = employeeNumberSeq.next()
    // nationalIdNumber/phone are unique columns — derive them from the
    // employee number itself (always-incrementing, collision-free even
    // across repeated runs of this script) rather than the ladder-position
    // seed (which restarts from 1 on every run and would otherwise collide
    // with an earlier run's employees).
    const uniqueSeed = parseInt(employeeNumber.split("-")[1] ?? "0", 10)
    const branch = branches[seed % branches.length]
    const dateOfBirth = dateFromSeed(seed, 1968, 32)
    const employmentStartDate = toWeekday(dateFromSeed(seed + 3, 2018, 7))

    await upsertEmployee({
      employeeNumber,
      firstName,
      lastName,
      email: `${firstName.toLowerCase().replace(/[^a-z]/g, "")}.${lastName.toLowerCase()}.${employeeNumber.toLowerCase()}@ncbarwanda.com`,
      gender,
      dateOfBirth,
      nationalIdNumber: nationalId(uniqueSeed),
      nationality: "Rwandan",
      maritalStatus: [MaritalStatus.SINGLE, MaritalStatus.MARRIED, MaritalStatus.MARRIED, MaritalStatus.DIVORCED][seed % 4],
      phone: phoneNumber(uniqueSeed),
      branchId: branch.id,
      positionId: position.id,
      bandId: band.id,
      employmentStartDate,
      contractType: ContractType.PERMANENT,
    })

    created.push(employeeNumber)
  }

  return created
}

/** Fills the Executive Office's Director-level position (PositionLevel.code
 *  "E1" — see DIRECTOR_LEVEL_CODE in positions.service.ts) with an
 *  employee, if that position exists and is currently vacant. Leaves it
 *  alone if it's already held, and skips (with a note) if no Director
 *  position exists yet at all — create one via the Positions admin page
 *  first if you want it filled. */
async function fillDirectorIfVacant(
  directorPosition: { id: string } | null,
  namePicker: () => { firstName: string; lastName: string; gender: Gender },
  employeeNumberSeq: { next: () => string },
  branches: { id: string }[],
  bandsByRank: Map<number, { id: string }>
): Promise<string | null> {
  if (!directorPosition) {
    console.log("No Director-level position found under Executive Office — skipping (nothing to fill).")
    return null
  }

  const holder = await prisma.employee.findFirst({ where: { positionId: directorPosition.id, isActive: true } })
  if (holder) {
    console.log(`Director-level position is already held by ${holder.firstName} ${holder.lastName} (${holder.employeeNumber}) — leaving as is.`)
    return holder.employeeNumber
  }

  const { firstName, lastName, gender } = namePicker()
  const employeeNumber = employeeNumberSeq.next()
  const band = bandsByRank.get(10)!
  const branch = branches[0]
  // nationalIdNumber/phone are unique columns — derive them from the
  // employee number itself (always-incrementing, collision-free even across
  // repeated runs of this script), same approach as buildDepartmentLadder().
  const uniqueSeed = parseInt(employeeNumber.split("-")[1] ?? "0", 10)

  await upsertEmployee({
    employeeNumber,
    firstName,
    lastName,
    email: `${firstName.toLowerCase().replace(/[^a-z]/g, "")}.${lastName.toLowerCase()}.${employeeNumber.toLowerCase()}@ncbarwanda.com`,
    gender,
    dateOfBirth: new Date("1972-04-18"),
    nationalIdNumber: nationalId(uniqueSeed),
    nationality: "Rwandan",
    maritalStatus: MaritalStatus.MARRIED,
    phone: phoneNumber(uniqueSeed),
    branchId: branch.id,
    positionId: directorPosition.id,
    bandId: band.id,
    employmentStartDate: new Date("2019-02-04"),
    contractType: ContractType.PERMANENT,
  })

  console.log(`Filled the Director-level position with ${firstName} ${lastName} (${employeeNumber}).`)
  return employeeNumber
}

// ---- leave catalog + requests -----------------------------------------------

async function seedLeaveCatalog() {
  const typeDefs: Array<{
    name: string
    code: string
    category: LeaveCategory
    affectsAnnualBalance?: boolean
    genderRestriction?: Gender
    maxDaysPerYear?: number
    requiresDocumentation?: boolean
    documentationThresholdDays?: number
  }> = [
    { name: "Annual Leave", code: "ANNUAL", category: LeaveCategory.ANNUAL },
    { name: "Sick Leave", code: "SICK", category: LeaveCategory.SICK, maxDaysPerYear: 10, requiresDocumentation: true, documentationThresholdDays: 3 },
    { name: "Maternity Leave", code: "MATERNITY", category: LeaveCategory.MATERNITY, affectsAnnualBalance: false, genderRestriction: Gender.FEMALE, maxDaysPerYear: 84 },
    { name: "Paternity Leave", code: "PATERNITY", category: LeaveCategory.PATERNITY, affectsAnnualBalance: false, genderRestriction: Gender.MALE, maxDaysPerYear: 4 },
    { name: "Compassionate Leave", code: "COMPASSIONATE", category: LeaveCategory.COMPASSIONATE, maxDaysPerYear: 5 },
    { name: "Study Leave", code: "STUDY", category: LeaveCategory.OTHER, maxDaysPerYear: 10, requiresDocumentation: true },
  ]

  const types = new Map<string, { id: string; name: string }>()
  for (const def of typeDefs) {
    const type = await prisma.leaveType.upsert({
      where: { name: def.name },
      update: {},
      create: {
        name: def.name,
        code: def.code,
        category: def.category,
        affectsAnnualBalance: def.affectsAnnualBalance ?? true,
        genderRestriction: def.genderRestriction,
        maxDaysPerYear: def.maxDaysPerYear,
        requiresDocumentation: def.requiresDocumentation ?? false,
        documentationThresholdDays: def.documentationThresholdDays,
      },
    })
    types.set(def.name, type)

    // Default 2-step workflow: Line Manager, then HR.
    await prisma.leaveApprovalStep.upsert({
      where: { leaveTypeId_order: { leaveTypeId: type.id, order: 1 } },
      update: {},
      create: { leaveTypeId: type.id, order: 1, role: ApprovalRole.LINE_MANAGER },
    })
    await prisma.leaveApprovalStep.upsert({
      where: { leaveTypeId_order: { leaveTypeId: type.id, order: 2 } },
      update: {},
      create: { leaveTypeId: type.id, order: 2, role: ApprovalRole.HR },
    })
  }

  const annual = types.get("Annual Leave")!
  const entitlements: Array<[LeaveEntitlementCategory, number]> = [
    [LeaveEntitlementCategory.PERMANENT, 21],
    [LeaveEntitlementCategory.TEMPORARY, 18],
    [LeaveEntitlementCategory.GRADUATE_TRAINEE, 18],
    [LeaveEntitlementCategory.INTERN, 0],
    [LeaveEntitlementCategory.MANAGING_DIRECTOR, 28],
  ]
  for (const [category, days] of entitlements) {
    await prisma.leaveEntitlementRule.upsert({
      where: { leaveTypeId_employeeCategory: { leaveTypeId: annual.id, employeeCategory: category } },
      update: { days },
      create: { leaveTypeId: annual.id, employeeCategory: category, days },
    })
  }

  await prisma.leaveCarryForwardRule.upsert({
    where: { leaveTypeId: annual.id },
    update: {},
    create: { leaveTypeId: annual.id, enabled: true, maxDays: 5, expiresAfterDays: 90, autoExpiryEnabled: true },
  })

  console.log(`Seeded ${typeDefs.length} leave types with approval steps, entitlement rules, and a carry-forward policy.`)
  return types
}

/** Every position's incumbent, keyed by the employee whose manager we want
 *  to find — walked via Position.reportsToPositionId, same derivation
 *  ReportingService uses at runtime. Falls back to EMP-0001 (the HR head)
 *  for anyone whose manager position is vacant or unset. */
async function buildManagerMap(): Promise<Map<string, string>> {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { employeeNumber: true, positionId: true },
  })
  const positionIdToEmployee = new Map<string, string>()
  for (const employee of employees) {
    if (employee.positionId) positionIdToEmployee.set(employee.positionId, employee.employeeNumber)
  }
  const positions = await prisma.position.findMany({ select: { id: true, reportsToPositionId: true } })
  const positionToParent = new Map(positions.map((p) => [p.id, p.reportsToPositionId]))

  const managerMap = new Map<string, string>()
  for (const employee of employees) {
    if (!employee.positionId) continue
    const parentPositionId = positionToParent.get(employee.positionId)
    const managerEmployeeNumber = parentPositionId ? positionIdToEmployee.get(parentPositionId) : undefined
    if (managerEmployeeNumber && managerEmployeeNumber !== employee.employeeNumber) {
      managerMap.set(employee.employeeNumber, managerEmployeeNumber)
    }
  }
  return managerMap
}

const REASON_BY_TYPE: Record<string, string[]> = {
  "Annual Leave": ["Family vacation", "Personal travel", "Rest and recuperation", "Visiting family upcountry"],
  "Sick Leave": ["Flu and fever", "Medical appointment recovery", "Doctor-recommended rest"],
  "Compassionate Leave": ["Family bereavement", "Supporting a family member through hospitalization"],
  "Maternity Leave": ["Maternity leave following childbirth"],
  "Paternity Leave": ["Paternity leave following the birth of a child"],
  "Study Leave": ["Sitting final exams", "Attending a certification course"],
}

/**
 * Creates one LeaveRequest with a matching LeaveApproval row per workflow
 * step (decided or still pending, depending on `status`) and nudges the
 * relevant LeaveBalance counters (takenDays/pendingDays) so the Leave
 * pages show consistent numbers immediately. entitledDays is deliberately
 * left at 0 on a newly-created balance row — LeaveBalancesService.
 * ensureBalancesForEmployee() self-heals it to the correct entitlement the
 * first time anyone opens that employee's Leave page, without touching
 * the taken/pending counters this function just set.
 */
async function createLeaveRequest(params: {
  employeeId: string
  leaveType: { id: string; name: string }
  steps: { id: string; order: number; role: ApprovalRole }[]
  startDate: Date
  lengthDays: number
  status: LeaveRequestStatus
  approverId: string
  seed: number
}) {
  const { employeeId, leaveType, steps, startDate, lengthDays, status, approverId, seed } = params

  const endDate = new Date(startDate)
  let counted = 1
  while (counted < lengthDays) {
    endDate.setUTCDate(endDate.getUTCDate() + 1)
    const day = endDate.getUTCDay()
    if (day !== 0 && day !== 6) counted++
  }
  const returnDate = nextWeekday(endDate)
  const numberOfDays = countWeekdays(startDate, endDate)

  let currentStepOrder: number | null = steps[0]?.order ?? null
  let cancellationReason: string | undefined
  let cancelledAt: Date | undefined
  let cancelledById: string | undefined

  if (status === LeaveRequestStatus.APPROVED || status === LeaveRequestStatus.REJECTED) {
    currentStepOrder = null
  } else if (status === LeaveRequestStatus.PENDING_APPROVAL) {
    currentStepOrder = steps[1]?.order ?? null
  } else if (status === LeaveRequestStatus.CANCELLED) {
    currentStepOrder = null
    cancellationReason = "No longer needed — plans changed."
    cancelledAt = new Date(startDate.getTime() - 2 * 86400000)
    cancelledById = employeeId
  }

  const reasonPool = REASON_BY_TYPE[leaveType.name] ?? ["Personal reasons"]
  const reason = reasonPool[seed % reasonPool.length]

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId: leaveType.id,
      startDate,
      endDate,
      returnDate,
      numberOfDays,
      reason,
      status,
      currentStepOrder,
      cancellationReason,
      cancelledAt,
      cancelledById,
    },
  })

  for (const step of steps) {
    const stepIsDecided =
      status === LeaveRequestStatus.APPROVED ||
      (status === LeaveRequestStatus.PENDING_APPROVAL && step.order === 1) ||
      (status === LeaveRequestStatus.REJECTED && step.order === 1)

    const decision = stepIsDecided ? (status === LeaveRequestStatus.REJECTED ? ApprovalDecision.REJECTED : ApprovalDecision.APPROVED) : null
    const decidedAt = stepIsDecided ? new Date(startDate.getTime() - (steps.length - step.order + 1) * 86400000) : null
    const approverEmployeeId = stepIsDecided ? (step.role === ApprovalRole.HR ? "EMP-0001" : approverId) : null

    await prisma.leaveApproval.create({
      data: { leaveRequestId: request.id, stepId: step.id, order: step.order, role: step.role, decision, decidedAt, approverEmployeeId },
    })
  }

  const year = startDate.getUTCFullYear()
  const takenDelta = status === LeaveRequestStatus.APPROVED ? numberOfDays : 0
  const pendingDelta = status === LeaveRequestStatus.SUBMITTED || status === LeaveRequestStatus.PENDING_APPROVAL ? numberOfDays : 0

  if (takenDelta > 0 || pendingDelta > 0) {
    const existingBalance = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId: leaveType.id, year } },
    })
    if (existingBalance) {
      await prisma.leaveBalance.update({
        where: { id: existingBalance.id },
        data: { takenDays: existingBalance.takenDays + takenDelta, pendingDays: existingBalance.pendingDays + pendingDelta },
      })
    } else {
      await prisma.leaveBalance.create({
        data: { employeeId, leaveTypeId: leaveType.id, year, entitledDays: 0, takenDays: takenDelta, pendingDays: pendingDelta },
      })
    }
  }

  return request
}

async function seedLeaveRequests(employeeNumbers: string[]) {
  const types = await prisma.leaveType.findMany()
  const byName = new Map(types.map((t) => [t.name, t]))
  const annual = byName.get("Annual Leave")!
  const sick = byName.get("Sick Leave")!
  const compassionate = byName.get("Compassionate Leave")!
  const maternity = byName.get("Maternity Leave")!
  const paternity = byName.get("Paternity Leave")!

  const stepsByType = new Map<string, { id: string; order: number; role: ApprovalRole }[]>()
  for (const type of types) {
    stepsByType.set(type.id, await prisma.leaveApprovalStep.findMany({ where: { leaveTypeId: type.id }, orderBy: { order: "asc" } }))
  }

  const managerMap = await buildManagerMap()
  const employees = await prisma.employee.findMany({
    where: { employeeNumber: { in: employeeNumbers } },
    select: { employeeNumber: true, gender: true },
  })

  let requestCount = 0
  let seed = 0

  for (const employee of employees) {
    seed += 1
    const approverId = managerMap.get(employee.employeeNumber) ?? "EMP-0001"

    await createLeaveRequest({
      employeeId: employee.employeeNumber,
      leaveType: annual,
      steps: stepsByType.get(annual.id)!,
      startDate: toWeekday(dateFromSeed(seed, 2025, 1)),
      lengthDays: 3 + (seed % 5),
      status: LeaveRequestStatus.APPROVED,
      approverId,
      seed,
    })
    requestCount++

    const cycle = seed % 5
    let type = annual
    if (cycle === 1) type = sick
    else if (cycle === 2) type = employee.gender === Gender.FEMALE ? maternity : paternity
    else if (cycle === 3) type = compassionate

    const status = [
      LeaveRequestStatus.SUBMITTED,
      LeaveRequestStatus.PENDING_APPROVAL,
      LeaveRequestStatus.APPROVED,
      LeaveRequestStatus.REJECTED,
      LeaveRequestStatus.CANCELLED,
    ][cycle]

    const lengthDays = type.name === "Maternity Leave" ? 84 : type.name === "Paternity Leave" ? 4 : 2 + (seed % 4)

    await createLeaveRequest({
      employeeId: employee.employeeNumber,
      leaveType: type,
      steps: stepsByType.get(type.id)!,
      startDate: toWeekday(dateFromSeed(seed + 50, 2026, 1)),
      lengthDays,
      status,
      approverId,
      seed,
    })
    requestCount++
  }

  console.log(`Seeded ${requestCount} leave requests (with approval trail) across FY2025/FY2026.`)
}

// ---- performance -------------------------------------------------------------

async function seedPerformancePeriods() {
  const fy2025 = await prisma.performanceReviewPeriod.upsert({
    where: { name: "FY2025" },
    update: {
      midYearStatus: PerformanceCycleStatus.CLOSED,
      midYearOpensAt: new Date("2025-06-01"),
      midYearClosesAt: new Date("2025-07-15"),
      annualStatus: PerformanceCycleStatus.CLOSED,
      annualOpensAt: new Date("2025-12-01"),
      annualClosesAt: new Date("2026-01-15"),
    },
    create: {
      name: "FY2025",
      year: 2025,
      midYearStatus: PerformanceCycleStatus.CLOSED,
      midYearOpensAt: new Date("2025-06-01"),
      midYearClosesAt: new Date("2025-07-15"),
      annualStatus: PerformanceCycleStatus.CLOSED,
      annualOpensAt: new Date("2025-12-01"),
      annualClosesAt: new Date("2026-01-15"),
    },
  })

  const fy2026 = await prisma.performanceReviewPeriod.upsert({
    where: { name: "FY2026" },
    update: { midYearStatus: PerformanceCycleStatus.OPEN, midYearOpensAt: new Date("2026-06-01") },
    create: { name: "FY2026", year: 2026, midYearStatus: PerformanceCycleStatus.OPEN, midYearOpensAt: new Date("2026-06-01") },
  })

  console.log("Seeded performance review periods: FY2025 (closed) and FY2026 (mid-year open).")
  return { fy2025, fy2026 }
}

async function seedPerformanceReviews(periods: { fy2025: { id: string }; fy2026: { id: string } }, employeeNumbers: string[]) {
  const managerMap = await buildManagerMap()
  const employees = await prisma.employee.findMany({
    where: { employeeNumber: { in: employeeNumbers } },
    include: { position: true },
  })

  const midYearStatusCycle = [
    PerformanceReviewStatus.DRAFT,
    PerformanceReviewStatus.SUBMITTED,
    PerformanceReviewStatus.SUBMITTED,
    PerformanceReviewStatus.ACKNOWLEDGED,
  ]

  let count = 0
  let seed = 0

  for (const employee of employees) {
    seed += 1
    const reviewerId = managerMap.get(employee.employeeNumber) ?? "EMP-0001"
    const rating = 2 + (seed % 4)

    await prisma.performanceReview.upsert({
      where: {
        periodId_employeeId_reviewType: {
          periodId: periods.fy2025.id,
          employeeId: employee.employeeNumber,
          reviewType: PerformanceReviewType.ANNUAL,
        },
      },
      update: {},
      create: {
        periodId: periods.fy2025.id,
        employeeId: employee.employeeNumber,
        reviewType: PerformanceReviewType.ANNUAL,
        status: PerformanceReviewStatus.FINALIZED,
        reviewerId,
        departmentId: employee.position?.departmentId,
        unitId: employee.position?.unitId,
        positionId: employee.positionId,
        levelId: employee.position?.levelId,
        bandId: employee.bandId,
        branchId: employee.branchId,
        contractType: employee.contractType,
        gender: employee.gender,
        overallRating: rating,
        strengths: "Reliable, collaborative, and consistent with deadlines.",
        achievements: "Delivered assigned goals for the period on schedule.",
        areasForImprovement: "Continue developing cross-team communication.",
        goalsAchieved: "Met core objectives for FY2025.",
        managerComments: "Solid, dependable contribution this cycle.",
        hrComments: "No outstanding concerns.",
        submittedAt: new Date("2026-01-05"),
        finalizedAt: new Date("2026-01-12"),
      },
    })
    count++

    const midYearStatus = midYearStatusCycle[seed % midYearStatusCycle.length]
    await prisma.performanceReview.upsert({
      where: {
        periodId_employeeId_reviewType: {
          periodId: periods.fy2026.id,
          employeeId: employee.employeeNumber,
          reviewType: PerformanceReviewType.MID_YEAR,
        },
      },
      update: {},
      create: {
        periodId: periods.fy2026.id,
        employeeId: employee.employeeNumber,
        reviewType: PerformanceReviewType.MID_YEAR,
        status: midYearStatus,
        reviewerId,
        departmentId: employee.position?.departmentId,
        unitId: employee.position?.unitId,
        positionId: employee.positionId,
        levelId: employee.position?.levelId,
        bandId: employee.bandId,
        branchId: employee.branchId,
        contractType: employee.contractType,
        gender: employee.gender,
        goalsAchieved: midYearStatus === PerformanceReviewStatus.DRAFT ? null : "On track against FY2026 goals so far.",
        submittedAt: midYearStatus === PerformanceReviewStatus.DRAFT ? null : new Date("2026-07-10"),
        acknowledgedAt: midYearStatus === PerformanceReviewStatus.ACKNOWLEDGED ? new Date("2026-07-15") : null,
      },
    })
    count++
  }

  console.log(`Seeded ${count} performance reviews across FY2025 (finalized) and FY2026 (in progress).`)
}

// ---- main -------------------------------------------------------------------

async function main() {
  console.log("Seeding test data on top of the existing database...")

  const branchDefs: Array<[string, string]> = [
    ["Kigali Heights Branch", "KIGALI_HEIGHTS_BRANCH"],
    ["Remera Branch", "REMERA_BRANCH"],
    ["Nyabugogo Branch", "NYABUGOGO_BRANCH"],
    ["Gisozi Branch", "GISOZI_BRANCH"],
    ["Rusizi Branch", "RUSIZI_BRANCH"],
  ]
  const branches = []
  for (const [name, code] of branchDefs) {
    branches.push(await upsertBranch(name, code))
  }
  console.log(`Seeded ${branches.length} branches.`)

  const hrDept = await findDepartment("Human Resources", ["Human Resources"])
  const execDept = await findDepartment("Executive Office", ["Executive Office"])
  const itDept = await findDepartment("IT", ["Information Technology", "IT Department", "IT"])

  const levelNames = ["Senior Manager", "Manager", "Assistant Manager", "Officer", "Operations Assistant", "General Manager"]
  const levelsByName = new Map<string, { id: string }>()
  for (const name of levelNames) {
    const level = await prisma.positionLevel.findUnique({ where: { name } })
    if (!level) throw new Error(`Position level "${name}" not found — run \`npx prisma db seed\` first.`)
    levelsByName.set(name, level)
  }

  const bandsByRank = new Map<number, { id: string }>()
  for (let rank = 2; rank <= 10; rank++) {
    const band = await prisma.band.findUnique({ where: { name: `Band ${rank}` } })
    if (band) bandsByRank.set(rank, band)
  }

  const employeeNumberSeq = await makeEmployeeNumberSeq()
  const namePicker = makeNamePicker()

  const directorPosition = await prisma.position.findFirst({
    where: { departmentId: execDept.id, isActive: true, level: { code: "E1" } },
  })
  const directorEmployeeNumber = await fillDirectorIfVacant(directorPosition, namePicker, employeeNumberSeq, branches, bandsByRank)

  const gmLevelId = levelsByName.get("General Manager")!.id
  const hrHead = await ensureHeadPosition(hrDept.id, "Head of Human Resource Department", gmLevelId, directorPosition?.id ?? null)
  const itHead = await ensureHeadPosition(itDept.id, "Head of Department", gmLevelId, directorPosition?.id ?? null)

  const newEmployees: string[] = []
  newEmployees.push(
    ...(await buildDepartmentLadder("hr", hrDept, hrHead.id, levelsByName, bandsByRank, branches, namePicker, employeeNumberSeq, 0))
  )
  newEmployees.push(
    ...(await buildDepartmentLadder("it", itDept, itHead.id, levelsByName, bandsByRank, branches, namePicker, employeeNumberSeq, 20))
  )
  if (directorPosition) {
    newEmployees.push(
      ...(await buildDepartmentLadder("exec", execDept, directorPosition.id, levelsByName, bandsByRank, branches, namePicker, employeeNumberSeq, 40))
    )
  } else {
    console.log("Skipping the Executive Office supporting ladder — no Director-level position exists there yet.")
  }
  if (directorEmployeeNumber) newEmployees.push(directorEmployeeNumber)

  console.log(`Seeded ${newEmployees.length} new employees across Human Resources, IT, and Executive Office.`)

  await seedLeaveCatalog()
  await seedLeaveRequests(newEmployees)

  const periods = await seedPerformancePeriods()
  await seedPerformanceReviews(periods, [...newEmployees, "EMP-0001"])

  console.log("Done. Log in as any new employee with the default password (Staff@123) to explore — they'll be prompted to change it.")
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
