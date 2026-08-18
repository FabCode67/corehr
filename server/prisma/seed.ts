/**
 * Seeds the organizational structure examples straight out of the spec:
 * the IT Channels unit (department WITH units) and the Human Resources
 * department (department WITHOUT units), plus Executive Management and a
 * handful of stub departments to show the full Function -> Department
 * shape. Also seeds a short chain of employees so
 * EmployeesService.getReportingManager() has real data to resolve.
 *
 * Idempotent — safe to re-run (`npm run prisma:seed`), everything is
 * upserted by its natural unique key.
 */
import {
  ApprovalDecision,
  ApprovalRole,
  ApplicationStatus,
  AssessmentResult,
  AssessmentType,
  BackgroundCheckStatus,
  BackgroundCheckType,
  AppealOutcome,
  AppealStatus,
  ContractType,
  CourseAssignmentPriority,
  CourseAssignmentStatus,
  CourseDeliveryMethod,
  DisciplinaryCaseCategory,
  DisciplinaryCaseStatus,
  FieldType,
  FormInstanceStatus,
  FormPriority,
  FormStatus,
  Gender,
  GrievanceCategory,
  GrievanceStatus,
  HiringReason,
  InterviewRecommendation,
  InterviewStatus,
  InterviewType,
  JobPostingStatus,
  LeaveCategory,
  LeaveEntitlementCategory,
  LeaveRequestStatus,
  MaritalStatus,
  OfferStatus,
  OnboardingTaskType,
  PerformanceReviewStatus,
  PerformanceReviewType,
  PositionChangeType,
  PositionTrack,
  Prisma,
  PrismaClient,
  RecruitmentEmploymentType,
  RecruitmentPriority,
  RecruitmentStageName,
  RequisitionStatus,
  ScreeningDecision,
  SignatureStatus,
  SignerRole,
  StageStatus,
  WorkforcePlanStatus,
} from "@prisma/client"
import * as bcrypt from "bcryptjs"

import { DEFAULT_EMPLOYEE_PASSWORD } from "../src/modules/auth/default-password.constant"

const prisma = new PrismaClient()

/** UTC-only weekday count between two dates inclusive — mirrors
 *  LeaveCalendarService.compute()'s weekend-exclusion rule, simplified
 *  (no holiday lookup) since demo dates are deliberately holiday-free. */
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

async function upsertFunction(name: string) {
  return prisma.function.upsert({
    where: { name },
    update: {},
    create: { name },
  })
}

async function upsertDepartment(functionId: string, name: string) {
  return prisma.department.upsert({
    where: { functionId_name: { functionId, name } },
    update: {},
    create: { functionId, name },
  })
}

async function upsertUnit(departmentId: string, name: string) {
  return prisma.unit.upsert({
    where: { departmentId_name: { departmentId, name } },
    update: {},
    create: { departmentId, name },
  })
}

async function upsertLevel(
  name: string,
  rank: number,
  track: PositionTrack = "STANDARD",
  code?: string
) {
  const existing = await prisma.positionLevel.findUnique({ where: { name } })
  if (existing) {
    return prisma.positionLevel.update({
      where: { id: existing.id },
      data: { rank, track, code },
    })
  }

  const collisions = await prisma.positionLevel.findMany({
    where: { rank },
    orderBy: { id: "asc" },
  })

  if (collisions.length > 0) {
    const usedRanks = new Set(
      (await prisma.positionLevel.findMany({ select: { rank: true } })).map((level) => level.rank)
    )
    let nextTempRank = 1000

    for (const collision of collisions) {
      while (usedRanks.has(nextTempRank)) {
        nextTempRank += 1
      }

      usedRanks.add(nextTempRank)
      await prisma.positionLevel.update({
        where: { id: collision.id },
        data: { rank: nextTempRank },
      })
    }

    return prisma.positionLevel.update({
      where: { id: collisions[0].id },
      data: { name, rank, track, code },
    })
  }

  return prisma.positionLevel.create({
    data: { name, rank, track, code },
  })
}

async function upsertBand(name: string, rank: number) {
  return prisma.band.upsert({
    where: { name },
    update: { rank },
    create: { name, rank },
  })
}

/** `code` doubles as the migration key from the old WorkLocation enum — see
 *  backfillBranchesFromLegacyWorkLocation() below. */
async function upsertBranch(name: string, code: string, isHeadquarters = false) {
  const existingByCode = await prisma.branch.findUnique({ where: { code } }).catch(() => null)
  if (existingByCode) {
    return prisma.branch.update({
      where: { id: existingByCode.id },
      data: { name, isHeadquarters },
    })
  }

  const existingByName = await prisma.branch.findUnique({ where: { name } }).catch(() => null)
  if (existingByName) {
    return prisma.branch.update({
      where: { id: existingByName.id },
      data: { code, isHeadquarters },
    })
  }

  return prisma.branch.create({
    data: { name, code, isHeadquarters },
  })
}

/**
 * Picks up any employee (demo or created later through the app's own UI)
 * that still only has the deprecated `workLocation` enum value set and no
 * `branchId` yet, and assigns them the newly-seeded Branch row with the
 * matching `code`. Safe to re-run — only touches rows where branchId is
 * still null. See the Branch model's doc comment in schema.prisma.
 */
async function backfillBranchesFromLegacyWorkLocation(branchesByCode: Map<string, { id: string }>) {
  const orphaned = await prisma.employee.findMany({
    where: { branchId: null, workLocation: { not: null } },
    select: { employeeNumber: true, workLocation: true },
  })

  let backfilled = 0
  for (const employee of orphaned) {
    const branch = employee.workLocation ? branchesByCode.get(employee.workLocation) : undefined
    if (!branch) continue
    await prisma.employee.update({ where: { employeeNumber: employee.employeeNumber }, data: { branchId: branch.id } })
    backfilled += 1
  }

  if (backfilled > 0) {
    // eslint-disable-next-line no-console
    console.log(`Backfilled branchId for ${backfilled} existing employee(s) from their legacy work location.`)
  }
}

/**
 * One-time consolidation from the old 6-Function taxonomy down to 3
 * (Control / Business / Support — see the "Functions & Departments" comment
 * above). Reassigns any Department still pointing at one of the 6 legacy
 * Functions to its new home, then soft-deletes the legacy Function row
 * (mirrors FunctionsService.remove()'s isActive: false — never hard-deleted,
 * since historical Course/JobRequisition rows may still reference it by id).
 * Runs BEFORE this seed's own upsertDepartment() calls, so those calls land
 * on the just-reassigned rows (preserving their id, and therefore every
 * Position/Employee/PositionHistory already attached to them) instead of
 * creating empty duplicates. Safe to re-run — a legacy Function with no
 * Departments left, or already inactive, is a no-op.
 */
async function reconcileLegacyFunctions(
  controlFunction: { id: string },
  businessFunction: { id: string },
  supportFunction: { id: string }
) {
  const LEGACY_TO_NEW: Record<string, { id: string }> = {
    "Executive Management": controlFunction,
    "Risk & Compliance": controlFunction,
    "Security Functions": controlFunction,
    "Business Function": businessFunction,
    "Technology Function": supportFunction,
    "Support Functions": supportFunction,
  }

  const legacyFunctions = await prisma.function.findMany({
    where: { name: { in: Object.keys(LEGACY_TO_NEW) } },
    include: { departments: true },
  })

  let reassigned = 0
  for (const legacy of legacyFunctions) {
    const target = LEGACY_TO_NEW[legacy.name]
    if (!target) continue

    for (const dept of legacy.departments) {
      try {
        await prisma.department.update({ where: { id: dept.id }, data: { functionId: target.id } })
        reassigned += 1
      } catch {
        // A department of the same name already exists under the target
        // Function (unique functionId+name) — leave this one under the
        // legacy Function rather than fail the whole seed run; it needs a
        // manual rename/merge via the admin Departments page.
        // eslint-disable-next-line no-console
        console.warn(
          `Could not move department "${dept.name}" off legacy Function "${legacy.name}" — a department with that name already exists under the target Function. Reassign it manually.`
        )
      }
    }

    if (legacy.isActive) {
      await prisma.function.update({ where: { id: legacy.id }, data: { isActive: false } })
    }
  }

  if (reassigned > 0) {
    // eslint-disable-next-line no-console
    console.log(`Reassigned ${reassigned} department(s) from legacy Functions onto Control/Business/Support.`)
  }
}

async function upsertPosition(params: {
  title: string
  departmentId: string
  unitId?: string | null
  levelId: string
  reportsToPositionId?: string | null
}) {
  const { title, departmentId, unitId = null, levelId, reportsToPositionId = null } = params

  // Can't use prisma.position.upsert() here: Prisma's generated
  // WhereUniqueInput for the departmentId_unitId_title compound index
  // requires unitId to be a non-null string, even though the column
  // itself is nullable — the same NULL-in-compound-unique caveat noted in
  // schema.prisma. findFirst (a regular filter, not a unique lookup) has
  // no such restriction, so it's used here instead.
  const existing = await prisma.position.findFirst({
    where: { departmentId, unitId, title },
  })

  if (existing) {
    return prisma.position.update({
      where: { id: existing.id },
      data: { levelId, reportsToPositionId },
    })
  }

  return prisma.position.create({
    data: { title, departmentId, unitId, levelId, reportsToPositionId },
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
  isAdmin?: boolean
}) {
  const { positionId, bandId, branchId, employmentStartDate, isAdmin = false, ...basics } = params

  // Re-running the seed resets every demo employee's password back to the
  // default and re-applies isAdmin — convenient for getting back into a
  // known-good demo state after messing with a login locally.
  const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10)

  const employee = await prisma.employee.upsert({
    where: { employeeNumber: params.employeeNumber },
    update: { positionId, bandId, branchId, employmentStartDate, passwordHash, isAdmin },
    create: { ...basics, positionId, bandId, branchId, employmentStartDate, passwordHash, isAdmin },
  })

  // The seed calls Prisma directly (not EmployeesService), so — same as the
  // service's own assign-position step — make sure the first assignment
  // leaves behind an INITIAL_HIRE PositionHistory row.
  const hasHistory = await prisma.positionHistory.findFirst({
    where: { employeeId: employee.employeeNumber },
  })
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

async function main() {
  // ---- Position levels ---------------------------------------------------
  // The bank's real 10-level ladder (junior to senior). Replaces an earlier
  // 13-row Intern..Other-Executive/STANDARD-vs-EXECUTIVE-track scheme — see
  // prisma/migrations/20260809120000_update_position_levels_and_bands for
  // the one-time in-place rename of any already-deployed rows (existing
  // Position/Employee references are preserved by id; only name/rank move).
  // No `code`/track distinction in the new scheme — every level is STANDARD.
  const levelSupportStaff = await upsertLevel("Support Staff", 1)
  const levelOperationsAssistant = await upsertLevel("Operations Assistant", 2)
  const levelOfficer = await upsertLevel("Officer", 3)
  const levelAssistantManager = await upsertLevel("Assistant Manager", 4)
  const levelManager = await upsertLevel("Manager", 5)
  const levelSeniorManager = await upsertLevel("Senior Manager", 6)
  const levelAGM = await upsertLevel("Assistant General Manager", 7)
  const levelGM = await upsertLevel("General Manager", 8)
  const levelDeputyDirector = await upsertLevel("Deputy Director", 9)
  const levelDirector = await upsertLevel("Director", 10)

  // As requested: General Manager is the department-head level, while the
  // executive levels are Deputy Director and Director.
  const levelHoD = levelGM
  const levelMD = levelDirector
  const levelCEO = levelDeputyDirector
  const levelCOO = levelDeputyDirector
  const levelCTO = levelDeputyDirector
  const levelCFO = levelDeputyDirector

  void levelSupportStaff
  void levelOperationsAssistant

  // ---- Bands (1..10, plus Contractual Staff for non-payroll workers) -------
  const bands = new Map<number, Awaited<ReturnType<typeof upsertBand>>>()
  for (let i = 1; i <= 10; i++) {
    bands.set(i, await upsertBand(`Band ${i}`, i))
  }
  await upsertBand("Contractual Staff (DSA, GT & Intern)", 11)

  // ---- Functions & Departments ---------------------------------------------
  // Only 3 Functions exist now (standard banking "three lines" taxonomy):
  // Control (oversight/risk/compliance/security), Business (revenue-generating,
  // customer-facing), Support (back-office enablement). Previously this seed
  // created 6 separate Functions (Executive Management, Technology Function,
  // Support Functions, Business Function, Risk & Compliance, Security
  // Functions) — consolidated per explicit request. `techFunction` is kept as
  // an alias for `supportFunction` (rather than renaming its many downstream
  // references below) since Information Technology now rolls up under Support.
  const controlFunction = await upsertFunction("Control")
  const businessFunction = await upsertFunction("Business")
  const supportFunction = await upsertFunction("Support")
  const techFunction = supportFunction

  // Must run before the upsertDepartment() calls below, so a legacy
  // Department (with real employees/positions already attached to its id)
  // gets moved onto the row those calls would otherwise try to (re)create.
  await reconcileLegacyFunctions(controlFunction, businessFunction, supportFunction)

  const execDept = await upsertDepartment(controlFunction.id, "Executive Management")

  const itDept = await upsertDepartment(supportFunction.id, "Information Technology")
  const hrDept = await upsertDepartment(supportFunction.id, "Human Resources")
  await upsertDepartment(supportFunction.id, "Finance")

  await upsertDepartment(businessFunction.id, "Retail Banking")
  await upsertDepartment(businessFunction.id, "Corporate Banking")

  // ---- IT units --------------------------------------------------------
  const itChannels = await upsertUnit(itDept.id, "IT Channels")
  await upsertUnit(itDept.id, "IT Infrastructure")
  await upsertUnit(itDept.id, "IT Applications")

  // ---- Executive Management positions --------------------------------------
  const md = await upsertPosition({
    title: "Managing Director",
    departmentId: execDept.id,
    levelId: levelMD.id,
    reportsToPositionId: null, // root of the tree
  })
  await upsertPosition({
    title: "Chief Executive Officer",
    departmentId: execDept.id,
    levelId: levelCEO.id,
    reportsToPositionId: md.id,
  })
  await upsertPosition({
    title: "Chief Operating Officer",
    departmentId: execDept.id,
    levelId: levelCOO.id,
    reportsToPositionId: md.id,
  })
  await upsertPosition({
    title: "Chief Technology Officer",
    departmentId: execDept.id,
    levelId: levelCTO.id,
    reportsToPositionId: md.id,
  })
  await upsertPosition({
    title: "Chief Financial Officer",
    departmentId: execDept.id,
    levelId: levelCFO.id,
    reportsToPositionId: md.id,
  })

  // ---- IT department (has units) -------------------------------------------
  const itHoD = await upsertPosition({
    title: "Head of Department",
    departmentId: itDept.id,
    levelId: levelHoD.id,
    reportsToPositionId: md.id,
  })

  const itChannelsSrMgr = await upsertPosition({
    title: "Senior Manager",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelSeniorManager.id,
    reportsToPositionId: itHoD.id,
  })
  const amChannels = await upsertPosition({
    title: "Assistant Manager – Channels",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelAssistantManager.id,
    reportsToPositionId: itChannelsSrMgr.id,
  })
  const amApis = await upsertPosition({
    title: "Assistant Manager – APIs",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelAssistantManager.id,
    reportsToPositionId: itChannelsSrMgr.id,
  })
  const officerChannelsAnalyst = await upsertPosition({
    title: "Officer – Channels Analyst",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelOfficer.id,
    reportsToPositionId: amChannels.id,
  })
  await upsertPosition({
    title: "Officer – API Analyst",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelOfficer.id,
    reportsToPositionId: amApis.id,
  })
  await upsertPosition({
    title: "Officer – Transactions Analyst",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelOfficer.id,
    reportsToPositionId: amChannels.id,
  })
  await upsertPosition({
    title: "Officer – Systems Analyst",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelOfficer.id,
    reportsToPositionId: amChannels.id,
  })
  await upsertPosition({
    title: "Officer – Integration Analyst",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelOfficer.id,
    reportsToPositionId: amApis.id,
  })

  // ---- HR department (no units — positions attach directly) ---------------
  const hrHoD = await upsertPosition({
    title: "Head of Department",
    departmentId: hrDept.id,
    levelId: levelHoD.id,
    reportsToPositionId: md.id,
  })
  const hrManager = await upsertPosition({
    title: "Manager – Learning & Development / Recruitment",
    departmentId: hrDept.id,
    levelId: levelManager.id,
    reportsToPositionId: hrHoD.id,
  })
  await upsertPosition({
    title: "Assistant Manager – Payroll",
    departmentId: hrDept.id,
    levelId: levelAssistantManager.id,
    reportsToPositionId: hrManager.id, // spec: Assistant Manager reports to the Manager
  })
  await upsertPosition({
    title: "Officer – HR Data Analytics",
    departmentId: hrDept.id,
    levelId: levelOfficer.id,
    reportsToPositionId: hrManager.id, // spec: Officers report to the Manager
  })
  await upsertPosition({
    title: "Officer – Employee Wellbeing",
    departmentId: hrDept.id,
    levelId: levelOfficer.id,
    reportsToPositionId: hrManager.id,
  })

  // ---- Branches (work locations) ------------------------------------------
  const branchDefs: Array<[name: string, code: string, isHeadquarters?: boolean]> = [
    ["Headquarters", "HEADQUARTERS", true],
    ["Kigali Heights Branch", "KIGALI_HEIGHTS_BRANCH"],
    ["Downtown Branch", "DOWNTOWN_BRANCH"],
    ["Remera Branch", "REMERA_BRANCH"],
    ["Nyabugogo Branch", "NYABUGOGO_BRANCH"],
    ["Gisozi Branch", "GISOZI_BRANCH"],
    ["Rusizi Branch", "RUSIZI_BRANCH"],
    ["Musanze Branch", "MUSANZE_BRANCH"],
    ["Kayonza Branch", "KAYONZA_BRANCH"],
    ["Rubavu Branch", "RUBAVU_BRANCH"],
  ]
  const branchesByCode = new Map<string, Awaited<ReturnType<typeof upsertBranch>>>()
  for (const [name, code, isHeadquarters] of branchDefs) {
    branchesByCode.set(code, await upsertBranch(name, code, isHeadquarters ?? false))
  }
  const headquartersBranch = branchesByCode.get("HEADQUARTERS")!
  const kigaliHeightsBranch = branchesByCode.get("KIGALI_HEIGHTS_BRANCH")!

  // ---- A handful of employees, to prove reporting-manager derivation ------
  const employmentStartDate = new Date("2020-01-06")

  const md_employee = await upsertEmployee({
    employeeNumber: "EMP-0001",
    firstName: "Jean-Paul",
    lastName: "Mugisha",
    email: "jp.mugisha@ncbarwanda.com",
    gender: Gender.MALE,
    dateOfBirth: new Date("1978-03-12"),
    nationalIdNumber: "1198080012345671",
    nationality: "Rwandan",
    maritalStatus: MaritalStatus.MARRIED,
    phone: "+250788123001",
    branchId: headquartersBranch.id,
    positionId: md.id,
    bandId: bands.get(10)!.id,
    employmentStartDate,
    isAdmin: true, // Managing Director — full system access
  })
  const itHoD_employee = await upsertEmployee({
    employeeNumber: "EMP-0002",
    firstName: "Eric",
    lastName: "Ndayisenga",
    email: "e.ndayisenga@ncbarwanda.com",
    gender: Gender.MALE,
    dateOfBirth: new Date("1985-07-22"),
    nationalIdNumber: "1198580012345672",
    nationality: "Rwandan",
    maritalStatus: MaritalStatus.MARRIED,
    phone: "+250788123002",
    branchId: headquartersBranch.id,
    positionId: itHoD.id,
    bandId: bands.get(8)!.id,
    employmentStartDate,
    isAdmin: true, // IT Head of Department — also an HR admin for demo purposes, and a line manager (useful for testing the leave-approval queue)
  })
  const claudine_employee = await upsertEmployee({
    employeeNumber: "EMP-0003",
    firstName: "Claudine",
    lastName: "Umutoni",
    email: "c.umutoni@ncbarwanda.com",
    gender: Gender.FEMALE,
    dateOfBirth: new Date("1990-11-05"),
    nationalIdNumber: "1199080012345673",
    nationality: "Rwandan",
    maritalStatus: MaritalStatus.SINGLE,
    phone: "+250788123003",
    branchId: headquartersBranch.id,
    positionId: itChannelsSrMgr.id,
    bandId: bands.get(6)!.id,
    employmentStartDate,
  })
  const solange_employee = await upsertEmployee({
    employeeNumber: "EMP-0004",
    firstName: "Solange",
    lastName: "Ingabire",
    email: "s.ingabire@ncbarwanda.com",
    gender: Gender.FEMALE,
    dateOfBirth: new Date("1993-02-18"),
    nationalIdNumber: "1199380012345674",
    nationality: "Rwandan",
    maritalStatus: MaritalStatus.SINGLE,
    phone: "+250788123004",
    branchId: kigaliHeightsBranch.id,
    positionId: amChannels.id,
    bandId: bands.get(5)!.id,
    employmentStartDate,
  })
  const patrick_employee = await upsertEmployee({
    employeeNumber: "EMP-0005",
    firstName: "Patrick",
    lastName: "Habimana",
    email: "p.habimana@ncbarwanda.com",
    gender: Gender.MALE,
    dateOfBirth: new Date("1996-09-30"),
    nationalIdNumber: "1199680012345675",
    nationality: "Rwandan",
    maritalStatus: MaritalStatus.SINGLE,
    phone: "+250788123005",
    branchId: kigaliHeightsBranch.id,
    positionId: officerChannelsAnalyst.id,
    bandId: bands.get(3)!.id,
    employmentStartDate,
  })

  // Give the demo employees Employment Details so Leave Management has a
  // contract type to resolve entitlement categories from.
  for (const employee of [md_employee, itHoD_employee, claudine_employee, solange_employee, patrick_employee]) {
    await prisma.employee.update({
      where: { employeeNumber: employee.employeeNumber },
      data: {
        contractType: ContractType.PERMANENT,
        probationEndDate: new Date("2020-04-06"), // 3 months after employmentStartDate, long past
      },
    })
  }

  await seedLeaveManagement({
    md: md_employee,
    itHoD: itHoD_employee,
    claudine: claudine_employee,
    solange: solange_employee,
    patrick: patrick_employee,
  })

  await seedPerformanceManagement({
    md: md_employee,
    itHoD: itHoD_employee,
    claudine: claudine_employee,
    solange: solange_employee,
    patrick: patrick_employee,
  })

  await seedLearningManagement({
    md: md_employee,
    itHoD: itHoD_employee,
    claudine: claudine_employee,
    solange: solange_employee,
    patrick: patrick_employee,
    techFunction,
    levelManager,
  })

  await seedRecruitment({
    md: md_employee,
    itHoD: itHoD_employee,
    claudine: claudine_employee,
    itDept,
    itChannels,
    techFunction,
    levelOfficer,
    amApis,
    bands,
    headquartersBranch,
  })

  await seedFormsManagement({
    md: md_employee,
    itHoD: itHoD_employee,
    claudine: claudine_employee,
    solange: solange_employee,
    patrick: patrick_employee,
  })

  await seedEmployeeRelations({
    md: md_employee,
    itHoD: itHoD_employee,
    claudine: claudine_employee,
    solange: solange_employee,
    patrick: patrick_employee,
  })

  // Picks up employees created through the app's own UI before this branch
  // migration — the 5 demo employees above are already covered directly by
  // upsertEmployee(), so this only ever touches real, previously-existing
  // records.
  await backfillBranchesFromLegacyWorkLocation(branchesByCode)

  // eslint-disable-next-line no-console
  console.log(
    "Seed complete: org structure + 6 employees (5 demo + 1 hired via Recruitment) + Leave Management, Performance Management, Learning and Development, Recruitment Management, Forms Management & Employee Relations config/demo data."
  )
  // eslint-disable-next-line no-console
  console.log(
    "Try: GET /api/organization/org-chart, GET /api/employees/{Patrick's id}/reporting-manager, GET /api/leave/balances/employee/{Patrick's id}, GET /api/learning/analytics/overview, GET /api/recruitment/analytics/overview, GET /api/forms/analytics/overview, GET /api/employee-relations/analytics/overview"
  )
  // eslint-disable-next-line no-console
  console.log(
    `Login with any seeded employee's email, password "${DEFAULT_EMPLOYEE_PASSWORD}". Admins: jp.mugisha@ncbarwanda.com, e.ndayisenga@ncbarwanda.com. Staff: c.umutoni@ncbarwanda.com, s.ingabire@ncbarwanda.com, p.habimana@ncbarwanda.com.`
  )
}

type SeedEmployee = Awaited<ReturnType<typeof upsertEmployee>>

/**
 * Seeds the entire Leave Management configuration (leave types, the Annual
 * Leave entitlement table, default LINE_MANAGER -> HR approval workflow,
 * Annual's carry-forward rule, Rwanda public holidays, and the working-week
 * settings singleton), then creates 2026 leave balances and a handful of
 * demo leave requests in different lifecycle states for the 5 seeded
 * employees. Idempotent — safe to re-run, same as the rest of this script.
 */
async function seedLeaveManagement(employees: {
  md: SeedEmployee
  itHoD: SeedEmployee
  claudine: SeedEmployee
  solange: SeedEmployee
  patrick: SeedEmployee
}) {
  const { md, itHoD, claudine, solange, patrick } = employees
  const year = 2026

  // ---- Leave types -----------------------------------------------------
  const annual = await prisma.leaveType.upsert({
    where: { name: "Annual Leave" },
    update: {},
    create: {
      name: "Annual Leave",
      code: "ANNUAL",
      category: LeaveCategory.ANNUAL,
      affectsAnnualBalance: true,
      requiresDocumentation: false,
      requiresHrApproval: true,
    },
  })
  const maternity = await prisma.leaveType.upsert({
    where: { name: "Maternity Leave" },
    update: {},
    create: {
      name: "Maternity Leave",
      code: "MATERNITY",
      category: LeaveCategory.MATERNITY,
      affectsAnnualBalance: false,
      genderRestriction: Gender.FEMALE,
      maxDaysPerYear: 90,
      requiresDocumentation: true,
      requiresHrApproval: true,
    },
  })
  const paternity = await prisma.leaveType.upsert({
    where: { name: "Paternity Leave" },
    update: {},
    create: {
      name: "Paternity Leave",
      code: "PATERNITY",
      category: LeaveCategory.PATERNITY,
      affectsAnnualBalance: false,
      genderRestriction: Gender.MALE,
      maxDaysPerYear: 14,
      requiresDocumentation: false,
      requiresHrApproval: true,
    },
  })
  const sick = await prisma.leaveType.upsert({
    where: { name: "Sick Leave" },
    update: {},
    create: {
      name: "Sick Leave",
      code: "SICK",
      category: LeaveCategory.SICK,
      affectsAnnualBalance: false,
      maxDaysPerYear: 20, // HR-configurable default via PATCH /leave/types/:id
      requiresDocumentation: true,
      documentationThresholdDays: 3, // certificate only needed beyond 3 consecutive days
      requiresHrApproval: true,
    },
  })
  const compassionate = await prisma.leaveType.upsert({
    where: { name: "Compassionate Leave" },
    update: {},
    create: {
      name: "Compassionate Leave",
      code: "COMPASSIONATE",
      category: LeaveCategory.COMPASSIONATE,
      affectsAnnualBalance: false,
      maxDaysPerYear: 5, // HR-configurable default
      requiresDocumentation: true,
      requiresHrApproval: true,
    },
  })

  // ---- Annual Leave entitlement table (spec: Permanent 21 / Temporary 18
  // / Managing Director 28 / Intern 0; Graduate Trainee defaulted to 18,
  // same as Temporary, until HR sets it explicitly) -----------------------
  const entitlements: Array<[LeaveEntitlementCategory, number]> = [
    [LeaveEntitlementCategory.PERMANENT, 21],
    [LeaveEntitlementCategory.TEMPORARY, 18],
    [LeaveEntitlementCategory.GRADUATE_TRAINEE, 18],
    [LeaveEntitlementCategory.INTERN, 0],
    [LeaveEntitlementCategory.MANAGING_DIRECTOR, 28],
  ]
  for (const [employeeCategory, days] of entitlements) {
    await prisma.leaveEntitlementRule.upsert({
      where: { leaveTypeId_employeeCategory: { leaveTypeId: annual.id, employeeCategory } },
      update: { days },
      create: { leaveTypeId: annual.id, employeeCategory, days },
    })
  }

  // ---- Default approval workflow: Line Manager -> HR, for every type ----
  const approvalStepsByType = new Map<string, Awaited<ReturnType<typeof prisma.leaveApprovalStep.upsert>>[]>()
  for (const leaveType of [annual, maternity, paternity, sick, compassionate]) {
    const lineManagerStep = await prisma.leaveApprovalStep.upsert({
      where: { leaveTypeId_order: { leaveTypeId: leaveType.id, order: 1 } },
      update: { role: ApprovalRole.LINE_MANAGER },
      create: { leaveTypeId: leaveType.id, order: 1, role: ApprovalRole.LINE_MANAGER },
    })
    const hrStep = await prisma.leaveApprovalStep.upsert({
      where: { leaveTypeId_order: { leaveTypeId: leaveType.id, order: 2 } },
      update: { role: ApprovalRole.HR },
      create: { leaveTypeId: leaveType.id, order: 2, role: ApprovalRole.HR },
    })
    approvalStepsByType.set(leaveType.id, [lineManagerStep, hrStep])
  }

  // ---- Carry-forward: Annual Leave only, capped at 5 days, expiring 90
  // days into the following year (~March 31) ------------------------------
  await prisma.leaveCarryForwardRule.upsert({
    where: { leaveTypeId: annual.id },
    update: { enabled: true, maxDays: 5, expiresAfterDays: 90 },
    create: { leaveTypeId: annual.id, enabled: true, maxDays: 5, expiresAfterDays: 90 },
  })

  // ---- Leave settings singleton (defaults match the schema, seeded
  // explicitly so the config is visible/editable from the admin panel) ----
  await prisma.leaveSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, weekendDays: [0, 6], excludeWeekends: true, excludePublicHolidays: true },
  })

  // ---- Rwanda public holidays --------------------------------------------
  const fixedHolidays: Array<[string, string]> = [
    ["New Year's Day", "2026-01-01"],
    ["National Heroes' Day", "2026-02-01"],
    ["Genocide against the Tutsi Memorial Day", "2026-04-07"],
    ["Labour Day", "2026-05-01"],
    ["Independence Day", "2026-07-01"],
    ["Liberation Day", "2026-07-04"],
    ["Assumption Day", "2026-08-15"],
    ["Christmas Day", "2026-12-25"],
    ["Boxing Day", "2026-12-26"],
  ]
  for (const [name, date] of fixedHolidays) {
    await prisma.publicHoliday.upsert({
      where: { date: new Date(date) },
      update: { name, isRecurringAnnually: true },
      create: { name, date: new Date(date), isRecurringAnnually: true },
    })
  }
  // Date-varying holidays — re-entered each year by HR, not auto-recurring.
  const variableHolidays: Array<[string, string]> = [
    ["Umuganura Day", "2026-08-07"],
    ["Eid al-Fitr (observed)", "2026-03-20"],
  ]
  for (const [name, date] of variableHolidays) {
    await prisma.publicHoliday.upsert({
      where: { date: new Date(date) },
      update: { name, isRecurringAnnually: false },
      create: { name, date: new Date(date), isRecurringAnnually: false },
    })
  }

  // ---- 2026 leave balances for the 5 demo employees ----------------------
  // Mirrors LeaveBalancesService.ensureBalancesForEmployee's category
  // resolution, done inline here since the seed script talks to Prisma
  // directly rather than through Nest's DI-wired services.
  const balanceSetups: Array<{
    employee: SeedEmployee
    category: LeaveEntitlementCategory
  }> = [
    { employee: md, category: LeaveEntitlementCategory.MANAGING_DIRECTOR },
    { employee: itHoD, category: LeaveEntitlementCategory.PERMANENT },
    { employee: claudine, category: LeaveEntitlementCategory.PERMANENT },
    { employee: solange, category: LeaveEntitlementCategory.PERMANENT },
    { employee: patrick, category: LeaveEntitlementCategory.PERMANENT },
  ]

  async function ensureBalance(employee: SeedEmployee, leaveType: { id: string }, entitledDays: number) {
    return prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: { employeeId: employee.employeeNumber, leaveTypeId: leaveType.id, year },
      },
      update: { entitledDays },
      create: { employeeId: employee.employeeNumber, leaveTypeId: leaveType.id, year, entitledDays },
    })
  }

  const annualRuleDays = new Map(entitlements)
  for (const { employee, category } of balanceSetups) {
    await ensureBalance(employee, annual, annualRuleDays.get(category) ?? 0)
    await ensureBalance(employee, sick, sick.maxDaysPerYear ?? 0)
    await ensureBalance(employee, compassionate, compassionate.maxDaysPerYear ?? 0)
    if (employee.gender === Gender.FEMALE) {
      await ensureBalance(employee, maternity, maternity.maxDaysPerYear ?? 0)
    }
    if (employee.gender === Gender.MALE) {
      await ensureBalance(employee, paternity, paternity.maxDaysPerYear ?? 0)
    }
  }

  // ---- Demo leave requests, in different lifecycle states ---------------
  async function createDemoRequest(params: {
    employee: SeedEmployee
    leaveType: typeof annual
    startDate: string
    endDate: string
    status: LeaveRequestStatus
    reason: string
    /** How many of the type's ordered approval steps are already decided
     *  (APPROVED), starting from step 1. */
    stepsApproved: number
  }) {
    const { employee, leaveType, startDate, endDate, status, reason, stepsApproved } = params
    const start = new Date(startDate)
    const end = new Date(endDate)
    const numberOfDays = countWeekdays(start, end)
    const returnDate = nextWeekday(end)
    const steps = approvalStepsByType.get(leaveType.id) ?? []

    const existing = await prisma.leaveRequest.findFirst({
      where: { employeeId: employee.employeeNumber, leaveTypeId: leaveType.id, startDate: start },
    })
    if (existing) return existing

    const currentStepOrder =
      status === "APPROVED" || status === "REJECTED" || status === "CANCELLED"
        ? null
        : stepsApproved + 1

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.employeeNumber,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        returnDate,
        numberOfDays,
        reason,
        status,
        currentStepOrder,
        approvals: {
          create: steps.map((step, index) => ({
            stepId: step.id,
            order: step.order,
            role: step.role,
            decision: index < stepsApproved ? ApprovalDecision.APPROVED : null,
            approverEmployeeId: index < stepsApproved ? employee.employeeNumber : null, // demo data only
            decidedAt: index < stepsApproved ? new Date() : null,
          })),
        },
      },
    })

    // Reflect the request on the balance: APPROVED books takenDays,
    // anything still open reserves pendingDays.
    const balanceWhere = {
      employeeId_leaveTypeId_year: { employeeId: employee.employeeNumber, leaveTypeId: leaveType.id, year },
    }
    if (status === "APPROVED") {
      await prisma.leaveBalance.update({ where: balanceWhere, data: { takenDays: { increment: numberOfDays } } })
    } else if (status === "PENDING_APPROVAL" || status === "SUBMITTED") {
      await prisma.leaveBalance.update({ where: balanceWhere, data: { pendingDays: { increment: numberOfDays } } })
    }

    return request
  }

  // Eric (IT Head of Department) — currently on leave, spans "today".
  await createDemoRequest({
    employee: itHoD,
    leaveType: annual,
    startDate: "2026-07-10",
    endDate: "2026-07-17",
    status: LeaveRequestStatus.APPROVED,
    reason: "Family trip",
    stepsApproved: 2,
  })

  // Patrick (Officer) — approved, upcoming next month.
  await createDemoRequest({
    employee: patrick,
    leaveType: annual,
    startDate: "2026-08-03",
    endDate: "2026-08-07",
    status: LeaveRequestStatus.APPROVED,
    reason: "Annual leave",
    stepsApproved: 2,
  })

  // Solange (Assistant Manager) — line manager approved, awaiting HR.
  await createDemoRequest({
    employee: solange,
    leaveType: sick,
    startDate: "2026-09-01",
    endDate: "2026-09-03",
    status: LeaveRequestStatus.PENDING_APPROVAL,
    reason: "Recovering from flu",
    stepsApproved: 1,
  })

  // Claudine (Senior Manager) — just submitted, awaiting line manager.
  await createDemoRequest({
    employee: claudine,
    leaveType: compassionate,
    startDate: "2026-07-20",
    endDate: "2026-07-21",
    status: LeaveRequestStatus.PENDING_APPROVAL,
    reason: "Family bereavement",
    stepsApproved: 0,
  })
}

/**
 * Seeds the Performance Management rating scale, two review periods (FY2025
 * fully closed for history, FY2026 with its Mid-Year cycle open — "today"
 * in this demo dataset is July 2026), and a spread of reviews across
 * statuses (FINALIZED/SUBMITTED/DRAFT) and ratings so the dashboards and
 * history views have something real to show immediately. Reviewer chains
 * mirror the actual position hierarchy built above (each employee's
 * reviewer is their real reporting manager), not an arbitrary pick.
 */
async function seedPerformanceManagement(employees: {
  md: SeedEmployee
  itHoD: SeedEmployee
  claudine: SeedEmployee
  solange: SeedEmployee
  patrick: SeedEmployee
}) {
  const { md, itHoD, claudine, solange, patrick } = employees

  // ---- Rating scale (1-5) -------------------------------------------------
  // expectedPercentage is the classic 10/20/40/20/10 "forced curve" the
  // field's own schema.prisma comment calls out as the example — a bell
  // shape peaking at rank 3 (Succeeded). Left unset before this change,
  // which is why the dashboard's Expected % series rendered as null/flat
  // instead of a real reference curve.
  const scaleDefs: Array<[rank: number, label: string, description: string, expectedPercentage: number]> = [
    [5, "Outstanding", "Performance far exceeds expectations across all objectives.", 10],
    [4, "Exceeded Expectations", "Performance consistently surpasses expectations.", 20],
    [3, "Succeeded", "Performance fully meets all expectations.", 40],
    [2, "Meets Some Expectations", "Performance meets some, but not all, expectations.", 20],
    [1, "Unsatisfactory", "Performance falls significantly short of expectations.", 10],
  ]
  for (const [rank, label, description, expectedPercentage] of scaleDefs) {
    await prisma.performanceRatingScale.upsert({
      where: { rank },
      update: { label, description, expectedPercentage },
      create: { rank, label, description, expectedPercentage },
    })
  }

  // ---- Review periods -------------------------------------------------------
  const periodFY2025 = await prisma.performanceReviewPeriod.upsert({
    where: { name: "FY2025" },
    update: {
      midYearStatus: "CLOSED",
      midYearOpensAt: new Date("2025-06-01"),
      midYearClosesAt: new Date("2025-07-15"),
      annualStatus: "CLOSED",
      annualOpensAt: new Date("2025-12-01"),
      annualClosesAt: new Date("2026-01-15"),
    },
    create: {
      name: "FY2025",
      year: 2025,
      midYearStatus: "CLOSED",
      midYearOpensAt: new Date("2025-06-01"),
      midYearClosesAt: new Date("2025-07-15"),
      annualStatus: "CLOSED",
      annualOpensAt: new Date("2025-12-01"),
      annualClosesAt: new Date("2026-01-15"),
    },
  })

  const periodFY2026 = await prisma.performanceReviewPeriod.upsert({
    where: { name: "FY2026" },
    update: {
      midYearStatus: "OPEN",
      midYearOpensAt: new Date("2026-06-01"),
    },
    create: {
      name: "FY2026",
      year: 2026,
      midYearStatus: "OPEN",
      midYearOpensAt: new Date("2026-06-01"),
      annualStatus: "DRAFT",
    },
  })

  // ---- Reviews --------------------------------------------------------------
  // Reviewer chain matches the real position hierarchy: Patrick -> Solange ->
  // Claudine -> Eric (IT HoD) -> Jean-Paul (MD) -> nobody.
  const reviewerOf = new Map<string, string | null>([
    [md.employeeNumber, null],
    [itHoD.employeeNumber, md.employeeNumber],
    [claudine.employeeNumber, itHoD.employeeNumber],
    [solange.employeeNumber, claudine.employeeNumber],
    [patrick.employeeNumber, solange.employeeNumber],
  ])

  async function seedReview(params: {
    period: typeof periodFY2025
    employee: SeedEmployee
    reviewType: PerformanceReviewType
    status: PerformanceReviewStatus
    overallRating: number
    strengths: string
    achievements: string
    areasForImprovement: string
    goalsAchieved: string
    goalsNotAchieved: string
    behaviourCompetencies: string
    recommendedTraining: string
    developmentPlan: string
    managerComments: string
    employeeComments?: string
    hrComments?: string
  }) {
    const existing = await prisma.performanceReview.findUnique({
      where: {
        periodId_employeeId_reviewType: {
          periodId: params.period.id,
          employeeId: params.employee.employeeNumber,
          reviewType: params.reviewType,
        },
      },
    })
    if (existing) return existing

    const full = await prisma.employee.findUniqueOrThrow({
      where: { employeeNumber: params.employee.employeeNumber },
      include: { position: true },
    })

    const now = new Date()
    const submittedAt = params.status !== "DRAFT" ? now : null
    const acknowledgedAt = params.status === "ACKNOWLEDGED" || params.status === "FINALIZED" ? now : null
    const finalizedAt = params.status === "FINALIZED" ? now : null

    const review = await prisma.performanceReview.create({
      data: {
        periodId: params.period.id,
        employeeId: params.employee.employeeNumber,
        reviewType: params.reviewType,
        reviewerId: reviewerOf.get(params.employee.employeeNumber) ?? null,
        departmentId: full.position?.departmentId ?? null,
        unitId: full.position?.unitId ?? null,
        positionId: full.positionId,
        levelId: full.position?.levelId ?? null,
        bandId: full.bandId,
        branchId: full.branchId,
        contractType: full.contractType,
        gender: full.gender,
        status: params.status,
        overallRating: params.overallRating,
        strengths: params.strengths,
        achievements: params.achievements,
        areasForImprovement: params.areasForImprovement,
        goalsAchieved: params.goalsAchieved,
        goalsNotAchieved: params.goalsNotAchieved,
        behaviourCompetencies: params.behaviourCompetencies,
        recommendedTraining: params.recommendedTraining,
        developmentPlan: params.developmentPlan,
        managerComments: params.managerComments,
        employeeComments: params.employeeComments ?? null,
        hrComments: params.hrComments ?? null,
        submittedAt,
        acknowledgedAt,
        finalizedAt,
      },
    })

    const actions = ["CREATED"]
    if (submittedAt) actions.push("SUBMITTED")
    if (acknowledgedAt) actions.push("ACKNOWLEDGED")
    if (finalizedAt) actions.push("FINALIZED")
    for (const action of actions) {
      await prisma.performanceAuditLog.create({
        data: {
          reviewId: review.id,
          action,
          actorId: reviewerOf.get(params.employee.employeeNumber) ?? params.employee.employeeNumber,
          notes: "Seeded demo data",
        },
      })
    }

    return review
  }

  // FY2025 — fully closed history for everyone (both cycles).
  await seedReview({
    period: periodFY2025,
    employee: itHoD,
    reviewType: PerformanceReviewType.MID_YEAR,
    status: "FINALIZED",
    overallRating: 4,
    strengths: "Strong technical leadership across the IT department.",
    achievements: "Delivered the core banking channels upgrade on schedule.",
    areasForImprovement: "Delegate more of the day-to-day incident triage.",
    goalsAchieved: "Channels platform stability, API uptime targets.",
    goalsNotAchieved: "Cross-department automation initiative delayed.",
    behaviourCompetencies: "Decisive, collaborative, strong stakeholder management.",
    recommendedTraining: "Executive leadership programme.",
    developmentPlan: "Shadow the CTO on the technology roadmap for two quarters.",
    managerComments: "Consistently exceeds expectations; ready for broader scope.",
  })
  await seedReview({
    period: periodFY2025,
    employee: itHoD,
    reviewType: PerformanceReviewType.ANNUAL,
    status: "FINALIZED",
    overallRating: 5,
    strengths: "Exceptional delivery record for the year.",
    achievements: "Zero major outages; channels uptime at 99.98%.",
    areasForImprovement: "Continue building the succession bench.",
    goalsAchieved: "All annual OKRs met or exceeded.",
    goalsNotAchieved: "None.",
    behaviourCompetencies: "Outstanding leadership and technical judgement.",
    recommendedTraining: "None required this cycle.",
    developmentPlan: "Prepare for an expanded regional technology role.",
    managerComments: "Outstanding year — recommended for the technology leadership track.",
    hrComments: "Concur with the outstanding rating; flagged for succession planning.",
  })
  await seedReview({
    period: periodFY2025,
    employee: claudine,
    reviewType: PerformanceReviewType.MID_YEAR,
    status: "FINALIZED",
    overallRating: 3,
    strengths: "Reliable delivery on the Channels roadmap.",
    achievements: "Shipped the mobile banking API v2.",
    areasForImprovement: "Improve cross-team communication on delays.",
    goalsAchieved: "API v2 launch, team onboarding of two officers.",
    goalsNotAchieved: "Documentation backlog not cleared.",
    behaviourCompetencies: "Solid technical management, still building executive presence.",
    recommendedTraining: "Stakeholder communication workshop.",
    developmentPlan: "Own a cross-departmental initiative next cycle.",
    managerComments: "Solid, dependable mid-year performance.",
  })
  await seedReview({
    period: periodFY2025,
    employee: claudine,
    reviewType: PerformanceReviewType.ANNUAL,
    status: "FINALIZED",
    overallRating: 4,
    strengths: "Grew significantly in stakeholder management this year.",
    achievements: "Delivered API v2 and cleared the documentation backlog.",
    areasForImprovement: "Take on more strategic, less operational work.",
    goalsAchieved: "All annual goals met.",
    goalsNotAchieved: "None.",
    behaviourCompetencies: "Strong technical and people leadership.",
    recommendedTraining: "Senior management development programme.",
    developmentPlan: "Being considered for the Head of Department track.",
    managerComments: "Marked improvement over the year — exceeded expectations.",
  })
  await seedReview({
    period: periodFY2025,
    employee: solange,
    reviewType: PerformanceReviewType.MID_YEAR,
    status: "FINALIZED",
    overallRating: 2,
    strengths: "Good technical fundamentals.",
    achievements: "Completed onboarding of the new Channels officers.",
    areasForImprovement: "Missed two sprint deadlines; needs closer project tracking.",
    goalsAchieved: "Onboarding plan delivered.",
    goalsNotAchieved: "Sprint velocity targets.",
    behaviourCompetencies: "Needs to build more consistent follow-through.",
    recommendedTraining: "Project management fundamentals.",
    developmentPlan: "Weekly check-ins with manager for the next quarter.",
    managerComments: "Below expectations on delivery consistency — following up mid-cycle.",
  })
  await seedReview({
    period: periodFY2025,
    employee: solange,
    reviewType: PerformanceReviewType.ANNUAL,
    status: "FINALIZED",
    overallRating: 3,
    strengths: "Responded well to the mid-year feedback.",
    achievements: "Sprint delivery consistency improved markedly in H2.",
    areasForImprovement: "Continue strengthening estimation accuracy.",
    goalsAchieved: "Recovered delivery track record after mid-year.",
    goalsNotAchieved: "None outstanding.",
    behaviourCompetencies: "Improved follow-through and ownership.",
    recommendedTraining: "Advanced estimation & planning workshop.",
    developmentPlan: "Take ownership of the next platform migration workstream.",
    managerComments: "Good recovery — now fully meeting expectations.",
  })

  // FY2026 Mid-Year — open cycle, mixed statuses to show the workflow states.
  await seedReview({
    period: periodFY2026,
    employee: itHoD,
    reviewType: PerformanceReviewType.MID_YEAR,
    status: "FINALIZED",
    overallRating: 5,
    strengths: "Leading the branch-management platform rollout flawlessly.",
    achievements: "Zero-downtime migration to the new branch model.",
    areasForImprovement: "None significant this cycle.",
    goalsAchieved: "Branch management platform live on schedule.",
    goalsNotAchieved: "None.",
    behaviourCompetencies: "Exceptional execution and team leadership.",
    recommendedTraining: "None required.",
    developmentPlan: "Continue mentoring the senior manager bench.",
    managerComments: "Outstanding mid-year performance, on track for another strong annual review.",
    hrComments: "Reviewed and concur.",
  })
  await seedReview({
    period: periodFY2026,
    employee: claudine,
    reviewType: PerformanceReviewType.MID_YEAR,
    status: "SUBMITTED",
    overallRating: 4,
    strengths: "Owned the branch-model migration for the Channels unit end to end.",
    achievements: "Migrated 10 branches to the new Branch admin module with zero incidents.",
    areasForImprovement: "Keep building visibility with peer departments.",
    goalsAchieved: "Branch migration, officer team expansion.",
    goalsNotAchieved: "None yet — cycle in progress.",
    behaviourCompetencies: "Strong technical ownership, growing executive presence.",
    recommendedTraining: "Cross-functional leadership programme.",
    developmentPlan: "Lead the next org-wide platform initiative.",
    managerComments: "Excellent first half — submitted for HR review.",
  })
  await seedReview({
    period: periodFY2026,
    employee: solange,
    reviewType: PerformanceReviewType.MID_YEAR,
    status: "DRAFT",
    overallRating: 3,
    strengths: "Consistent delivery since the FY2025 annual review.",
    achievements: "On track with all H1 sprint commitments.",
    areasForImprovement: "Still finalizing this section.",
    goalsAchieved: "H1 sprint commitments met.",
    goalsNotAchieved: "TBD — cycle still in progress.",
    behaviourCompetencies: "Good ownership, improving estimation accuracy.",
    recommendedTraining: "TBD.",
    developmentPlan: "TBD.",
    managerComments: "Draft in progress — will finalize before the cycle closes.",
  })
  await seedReview({
    period: periodFY2026,
    employee: patrick,
    reviewType: PerformanceReviewType.MID_YEAR,
    status: "FINALIZED",
    overallRating: 1,
    strengths: "Enthusiastic and eager to learn.",
    achievements: "Completed the required onboarding certifications.",
    areasForImprovement: "Significant gaps in analysis accuracy and missed deadlines.",
    goalsAchieved: "Onboarding certifications only.",
    goalsNotAchieved: "Core analyst deliverables for the quarter.",
    behaviourCompetencies: "Needs closer supervision and a structured improvement plan.",
    recommendedTraining: "Data analysis fundamentals, time management workshop.",
    developmentPlan: "30-60-90 day performance improvement plan with weekly manager check-ins.",
    managerComments: "Performance is below the expected bar for this role — improvement plan initiated.",
    hrComments: "HR is tracking this employee's improvement plan closely.",
  })
}

async function seedLearningManagement(params: {
  md: SeedEmployee
  itHoD: SeedEmployee
  claudine: SeedEmployee
  solange: SeedEmployee
  patrick: SeedEmployee
  techFunction: { id: string }
  levelManager: { id: string }
}) {
  const { md, itHoD, claudine, solange, patrick, techFunction, levelManager } = params

  async function upsertInstitution(name: string) {
    return prisma.institution.upsert({ where: { name }, update: {}, create: { name } })
  }

  async function upsertCategory(name: string, isMandatory: boolean) {
    return prisma.trainingCategory.upsert({
      where: { name },
      update: { isMandatory },
      create: { name, isMandatory },
    })
  }

  async function upsertCourse(params: {
    courseCode: string
    name: string
    categoryId: string
    institutionId?: string
    cost?: number
    durationHours?: number
    deliveryMethod: CourseDeliveryMethod
    requiredFunctionId?: string
    requiredLevelId?: string
    autoAssignOnHire?: boolean
    autoAssignDueMonths?: number
  }) {
    const { courseCode, ...data } = params
    return prisma.course.upsert({ where: { courseCode }, update: data, create: { courseCode, ...data } })
  }

  /** Snapshot of an employee's org context, for CourseAssignment's
   *  point-in-time fields — same shape seedReview() reads for
   *  PerformanceReview. */
  async function snapshotOf(employee: SeedEmployee) {
    return prisma.employee.findUniqueOrThrow({
      where: { employeeNumber: employee.employeeNumber },
      include: { position: true },
    })
  }

  async function upsertAssignment(assignParams: {
    course: Awaited<ReturnType<typeof upsertCourse>>
    employee: SeedEmployee
    assignedBy?: SeedEmployee
    dueDate?: Date
    priority?: CourseAssignmentPriority
    recommendationComment?: string
    reasonForAssignment?: string
    status: CourseAssignmentStatus
    certificateUrl?: string
    hrVerificationComment?: string
    verifiedBy?: SeedEmployee
  }) {
    const { course, employee, assignedBy, status } = assignParams
    const full = await snapshotOf(employee)
    const category = await prisma.trainingCategory.findUniqueOrThrow({ where: { id: course.categoryId } })

    const now = new Date()
    const acceptedStatuses: CourseAssignmentStatus[] = [
      "ACCEPTED",
      "IN_PROGRESS",
      "COMPLETED_BY_EMPLOYEE",
      "PENDING_VERIFICATION",
      "VERIFIED",
      "REJECTED",
      "CLOSED",
    ]
    const startedStatuses: CourseAssignmentStatus[] = [
      "IN_PROGRESS",
      "COMPLETED_BY_EMPLOYEE",
      "PENDING_VERIFICATION",
      "VERIFIED",
      "REJECTED",
      "CLOSED",
    ]
    const completedStatuses: CourseAssignmentStatus[] = ["COMPLETED_BY_EMPLOYEE", "PENDING_VERIFICATION", "VERIFIED", "REJECTED", "CLOSED"]
    const certificateStatuses: CourseAssignmentStatus[] = ["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "CLOSED"]
    const verifiedStatuses: CourseAssignmentStatus[] = ["VERIFIED", "CLOSED"]

    const data = {
      courseId: course.id,
      employeeId: employee.employeeNumber,
      assignedById: assignedBy?.employeeNumber ?? null,
      categoryName: category.name,
      isMandatory: category.isMandatory,
      departmentId: full.position?.departmentId ?? null,
      unitId: full.position?.unitId ?? null,
      positionId: full.positionId,
      levelId: full.position?.levelId ?? null,
      bandId: full.bandId,
      branchId: full.branchId,
      contractType: full.contractType,
      dueDate: assignParams.dueDate ?? null,
      priority: assignParams.priority ?? CourseAssignmentPriority.MEDIUM,
      recommendationComment: assignParams.recommendationComment ?? null,
      reasonForAssignment: assignParams.reasonForAssignment ?? null,
      status,
      acceptedAt: acceptedStatuses.includes(status) ? now : null,
      startedAt: startedStatuses.includes(status) ? now : null,
      completedAt: completedStatuses.includes(status) ? now : null,
      certificateUploadedAt: certificateStatuses.includes(status) ? now : null,
      certificateUrl: certificateStatuses.includes(status) ? assignParams.certificateUrl ?? "https://res.cloudinary.com/demo/certificate.pdf" : null,
      verifiedAt: verifiedStatuses.includes(status) || status === "REJECTED" ? now : null,
      verifiedById: assignParams.verifiedBy?.employeeNumber ?? (verifiedStatuses.includes(status) || status === "REJECTED" ? itHoD.employeeNumber : null),
      hrVerificationComment: assignParams.hrVerificationComment ?? null,
      rejectedAt: status === "REJECTED" ? now : null,
      closedAt: status === "CLOSED" ? now : null,
    }

    const assignment = await prisma.courseAssignment.upsert({
      where: { courseId_employeeId: { courseId: course.id, employeeId: employee.employeeNumber } },
      update: data,
      create: data,
    })

    const existingLog = await prisma.courseAuditLog.findFirst({ where: { assignmentId: assignment.id } })
    if (!existingLog) {
      await prisma.courseAuditLog.create({
        data: { assignmentId: assignment.id, action: "ASSIGNED", actorId: assignedBy?.employeeNumber ?? null, notes: "Seeded demo data" },
      })
    }

    return assignment
  }

  // ---- Institutions -----------------------------------------------------
  const ncbaAcademy = await upsertInstitution("NCBA Learning Academy")
  const rwandaInstitute = await upsertInstitution("Rwanda Institute of Management")
  await upsertInstitution("LinkedIn Learning")

  // ---- Training categories -----------------------------------------------
  // Mandatory / regulatory + internal.
  const amlCategory = await upsertCategory("AML (Anti-Money Laundering)", true)
  const kycCategory = await upsertCategory("KYC", true)
  await upsertCategory("BNR Compliance", true)
  const dataPrivacyCategory = await upsertCategory("Data Privacy", true)
  await upsertCategory("Fraud Prevention", true)
  const codeOfConductCategory = await upsertCategory("Code of Conduct", true)
  const infoSecCategory = await upsertCategory("Information Security", true)
  await upsertCategory("Customer Experience", true)
  const workplaceEthicsCategory = await upsertCategory("Workplace Ethics", true)
  await upsertCategory("Occupational Health & Safety", true)

  // Non-mandatory / professional development.
  const leadershipCategory = await upsertCategory("Leadership", false)
  await upsertCategory("Project Management", false)
  const dataAnalyticsCategory = await upsertCategory("Data Analytics", false)
  await upsertCategory("Artificial Intelligence", false)
  await upsertCategory("Communication Skills", false)
  await upsertCategory("Banking Products", false)
  await upsertCategory("Microsoft Office", false)
  await upsertCategory("Cloud Computing", false)
  await upsertCategory("Programming", false)

  // ---- Courses -------------------------------------------------------------
  const amlFundamentals = await upsertCourse({
    courseCode: "CRS-0001",
    name: "AML Fundamentals",
    categoryId: amlCategory.id,
    institutionId: ncbaAcademy.id,
    cost: 0,
    durationHours: 8,
    deliveryMethod: CourseDeliveryMethod.ONLINE,
    autoAssignOnHire: true,
    autoAssignDueMonths: 12,
  })
  const kycEssentials = await upsertCourse({
    courseCode: "CRS-0002",
    name: "KYC Essentials",
    categoryId: kycCategory.id,
    institutionId: ncbaAcademy.id,
    cost: 0,
    durationHours: 6,
    deliveryMethod: CourseDeliveryMethod.ONLINE,
  })
  const dataPrivacyCourse = await upsertCourse({
    courseCode: "CRS-0003",
    name: "Data Privacy & Protection",
    categoryId: dataPrivacyCategory.id,
    institutionId: ncbaAcademy.id,
    durationHours: 4,
    deliveryMethod: CourseDeliveryMethod.ONLINE,
  })
  const codeOfConductCourse = await upsertCourse({
    courseCode: "CRS-0004",
    name: "Code of Conduct Training",
    categoryId: codeOfConductCategory.id,
    institutionId: ncbaAcademy.id,
    durationHours: 3,
    deliveryMethod: CourseDeliveryMethod.CLASSROOM,
  })
  const cyberSecurityCourse = await upsertCourse({
    courseCode: "CRS-0005",
    name: "Cyber Security Awareness",
    categoryId: infoSecCategory.id,
    institutionId: ncbaAcademy.id,
    durationHours: 5,
    deliveryMethod: CourseDeliveryMethod.ONLINE,
    requiredFunctionId: techFunction.id, // per spec: "Cyber Security Awareness -> Technology Function" — techFunction now aliases the Support Function (IT rolled up into it), see Control/Business/Support consolidation above
  })
  const workplaceEthicsCourse = await upsertCourse({
    courseCode: "CRS-0006",
    name: "Workplace Ethics",
    categoryId: workplaceEthicsCategory.id,
    institutionId: ncbaAcademy.id,
    durationHours: 2,
    deliveryMethod: CourseDeliveryMethod.CLASSROOM,
  })
  const leadershipProgramme = await upsertCourse({
    courseCode: "CRS-0007",
    name: "Leadership Programme",
    categoryId: leadershipCategory.id,
    institutionId: rwandaInstitute.id,
    cost: 450000,
    durationHours: 40,
    deliveryMethod: CourseDeliveryMethod.HYBRID,
    // Per spec: "Leadership Programme -> Managers and above". This demo's
    // eligibility model only supports an exact level match rather than a
    // "this rank or more senior" comparison, so Manager is used as a
    // representative restriction — see Course.requiredLevelId in
    // schema.prisma for the limitation.
    requiredLevelId: levelManager.id,
  })
  const dataAnalyticsCourse = await upsertCourse({
    courseCode: "CRS-0008",
    name: "Data Analytics Fundamentals",
    categoryId: dataAnalyticsCategory.id,
    institutionId: rwandaInstitute.id,
    cost: 120000,
    durationHours: 16,
    deliveryMethod: CourseDeliveryMethod.ONLINE,
  })

  // ---- Demo assignments across the full lifecycle --------------------------

  // Patrick — auto-hire AML course, long overdue (employmentStartDate was
  // 2020-01-06 + 12 months = 2021-01-06) — demonstrates the mandatory
  // training overdue banner on both the employee and manager/HR dashboards.
  const amlDueDate = new Date("2021-01-06")
  await upsertAssignment({
    course: amlFundamentals,
    employee: patrick,
    dueDate: amlDueDate,
    priority: CourseAssignmentPriority.CRITICAL,
    reasonForAssignment: "Automatically assigned as mandatory onboarding training.",
    status: CourseAssignmentStatus.ASSIGNED,
  })

  // Patrick — in progress, due in the future.
  await upsertAssignment({
    course: kycEssentials,
    employee: patrick,
    assignedBy: itHoD,
    dueDate: new Date("2026-09-01"),
    priority: CourseAssignmentPriority.HIGH,
    status: CourseAssignmentStatus.IN_PROGRESS,
  })

  // Patrick — mandatory, upcoming (not yet started, not overdue).
  await upsertAssignment({
    course: workplaceEthicsCourse,
    employee: patrick,
    assignedBy: itHoD,
    dueDate: new Date("2026-10-01"),
    status: CourseAssignmentStatus.ASSIGNED,
  })

  // Solange — verified and closed (fully complete, in permanent history).
  await upsertAssignment({
    course: codeOfConductCourse,
    employee: solange,
    assignedBy: itHoD,
    dueDate: new Date("2025-03-01"),
    status: CourseAssignmentStatus.CLOSED,
    hrVerificationComment: "Completed on schedule.",
  })

  // Solange — accepted, with a recommendation comment (the "Recommended"
  // bucket) — the exact example from the spec.
  await upsertAssignment({
    course: dataAnalyticsCourse,
    employee: solange,
    assignedBy: itHoD,
    priority: CourseAssignmentPriority.LOW,
    recommendationComment: "Complete this course before taking ownership of the Digital Channels platform.",
    status: CourseAssignmentStatus.ACCEPTED,
  })

  // Claudine — awaiting HR verification (certificate uploaded, not yet reviewed).
  await upsertAssignment({
    course: cyberSecurityCourse,
    employee: claudine,
    assignedBy: itHoD,
    dueDate: new Date("2026-08-01"),
    status: CourseAssignmentStatus.PENDING_VERIFICATION,
  })

  // Claudine — certificate rejected, needs resubmission.
  await upsertAssignment({
    course: leadershipProgramme,
    employee: claudine,
    assignedBy: itHoD,
    status: CourseAssignmentStatus.REJECTED,
    hrVerificationComment: "The uploaded file was illegible — please re-scan and resubmit.",
  })

  // IT HoD — confirmed completion, certificate not uploaded yet.
  await upsertAssignment({
    course: dataPrivacyCourse,
    employee: itHoD,
    assignedBy: md,
    status: CourseAssignmentStatus.COMPLETED_BY_EMPLOYEE,
  })

  // Managing Director — verified.
  await upsertAssignment({
    course: leadershipProgramme,
    employee: md,
    status: CourseAssignmentStatus.VERIFIED,
    hrVerificationComment: "Executive Leadership track — verified by HR.",
  })

  // eslint-disable-next-line no-console
  console.log("Seeded Learning & Development: institutions, categories, courses, and demo assignments.")
}

/**
 * Seeds one Recruitment Management pipeline end-to-end: an approved
 * Workforce Plan, a Job Requisition (against a brand-new Position), a
 * reusable Job Description, a published Job Posting, and two Applications —
 * one (Alice) carried all the way through Screening, Assessment, Interview,
 * Background Check, Offer (accepted) and a fully-completed Onboarding
 * checklist that creates her as a real Employee (EMP-0006); the other
 * (Bosco) left mid-pipeline with an interview still scheduled, so the
 * Kanban/pipeline views have more than one stage represented. Idempotent —
 * safe to re-run, same as the rest of this script.
 */
async function seedRecruitment(params: {
  md: SeedEmployee
  itHoD: SeedEmployee
  claudine: SeedEmployee
  itDept: { id: string }
  itChannels: { id: string }
  techFunction: { id: string }
  levelOfficer: { id: string }
  amApis: { id: string }
  bands: Map<number, Awaited<ReturnType<typeof upsertBand>>>
  headquartersBranch: { id: string }
}) {
  const { md, itHoD, claudine, itDept, itChannels, techFunction, levelOfficer, amApis, bands, headquartersBranch } = params
  const band3 = bands.get(3)!.id

  async function upsertWorkforcePlan(
    title: string,
    data: {
      departmentId: string
      unitId?: string
      branchId: string
      hiringManagerId: string
      recruiterId: string
      numberOfPositions: number
      employmentType: RecruitmentEmploymentType
      priority: RecruitmentPriority
      expectedHiringDate?: Date
      businessJustification: string
      budget?: number
      status: WorkforcePlanStatus
      approvedById?: string
      approvedAt?: Date
    }
  ) {
    const existing = await prisma.workforcePlan.findFirst({ where: { title } })
    if (existing) return prisma.workforcePlan.update({ where: { id: existing.id }, data })
    return prisma.workforcePlan.create({ data: { title, ...data } })
  }

  async function upsertRequisition(
    workforcePlanId: string,
    positionId: string,
    data: {
      departmentId: string
      unitId?: string
      functionId: string
      bandId: string
      reportsToPositionId?: string
      numberOfVacancies: number
      contractType: ContractType
      branchId: string
      employmentType: RecruitmentEmploymentType
      hiringReason: HiringReason
      requestedById: string
      hiringManagerId: string
      recruiterId: string
      priority: RecruitmentPriority
      targetStartDate?: Date
      status: RequisitionStatus
      approvedById?: string
      approvedAt?: Date
    }
  ) {
    const existing = await prisma.jobRequisition.findFirst({ where: { workforcePlanId, positionId } })
    if (existing) return prisma.jobRequisition.update({ where: { id: existing.id }, data })
    return prisma.jobRequisition.create({ data: { workforcePlanId, positionId, ...data } })
  }

  async function upsertStage(
    requisitionId: string,
    stage: RecruitmentStageName,
    data: { plannedStart?: Date; plannedEnd?: Date; actualStart?: Date; actualEnd?: Date; ownerId?: string; status: StageStatus }
  ) {
    return prisma.recruitmentStageInstance.upsert({
      where: { requisitionId_stage: { requisitionId, stage } },
      update: data,
      create: { requisitionId, stage, ...data },
    })
  }

  async function upsertJobDescription(
    jobTitle: string,
    data: {
      jobSummary: string
      keyResponsibilities: string
      requiredQualifications: string
      requiredCertifications?: string | null
      requiredExperience?: string
      requiredSkills?: string
      technicalCompetencies?: string
      behaviouralCompetencies?: string
      requiredLevelId?: string
      requiredBandId?: string
      reportingManagerId?: string
      workLocation?: string
      isActive?: boolean
    }
  ) {
    const existing = await prisma.jobDescription.findFirst({ where: { jobTitle } })
    if (existing) return prisma.jobDescription.update({ where: { id: existing.id }, data })
    return prisma.jobDescription.create({ data: { jobTitle, ...data } })
  }

  async function upsertJobPosting(
    requisitionId: string,
    data: {
      postingTitle: string
      isInternal?: boolean
      isExternal?: boolean
      closingDate: Date
      description: string
      responsibilities: string
      qualifications: string
      branchId: string
      employmentType: RecruitmentEmploymentType
      requiredExperience?: string
      status: JobPostingStatus
      publishedAt?: Date
    }
  ) {
    const existing = await prisma.jobPosting.findFirst({ where: { requisitionId } })
    if (existing) return prisma.jobPosting.update({ where: { id: existing.id }, data })
    return prisma.jobPosting.create({ data: { requisitionId, ...data } })
  }

  async function upsertCandidate(
    email: string,
    data: {
      firstName: string
      lastName: string
      phone: string
      nationality: string
      cvUrl?: string
      coverLetterUrl?: string
      education?: string
      experience?: string
      certifications?: string
      skills?: string
      references?: string
    }
  ) {
    return prisma.candidate.upsert({ where: { email }, update: data, create: { email, ...data } })
  }

  async function upsertApplication(candidateId: string, jobPostingId: string, data: { status: ApplicationStatus; appliedAt: Date }) {
    return prisma.application.upsert({
      where: { candidateId_jobPostingId: { candidateId, jobPostingId } },
      update: data,
      create: { candidateId, jobPostingId, ...data },
    })
  }

  async function upsertScreening(applicationId: string, data: { decision: ScreeningDecision; comments?: string; screenedById: string }) {
    return prisma.screening.upsert({
      where: { applicationId },
      update: data,
      create: { applicationId, ...data },
    })
  }

  async function upsertAssessment(
    applicationId: string,
    assessmentType: AssessmentType,
    data: {
      scheduledDate?: Date
      score?: number
      maxScore?: number
      result: AssessmentResult
      evaluatorId?: string
      comments?: string
    }
  ) {
    const existing = await prisma.assessment.findFirst({ where: { applicationId, assessmentType } })
    if (existing) return prisma.assessment.update({ where: { id: existing.id }, data })
    return prisma.assessment.create({ data: { applicationId, assessmentType, ...data } })
  }

  async function upsertInterview(
    applicationId: string,
    interviewType: InterviewType,
    panelistIds: string[],
    data: {
      interviewDate: Date
      location?: string
      notes?: string
      recommendation?: InterviewRecommendation
      status: InterviewStatus
    }
  ) {
    const existing = await prisma.interview.findFirst({ where: { applicationId, interviewType } })
    const interview = existing
      ? await prisma.interview.update({ where: { id: existing.id }, data })
      : await prisma.interview.create({ data: { applicationId, interviewType, ...data } })

    await prisma.interviewPanelist.deleteMany({ where: { interviewId: interview.id } })
    await prisma.interviewPanelist.createMany({
      data: panelistIds.map((employeeId) => ({ interviewId: interview.id, employeeId })),
    })
    return interview
  }

  async function upsertBackgroundCheck(
    applicationId: string,
    checkType: BackgroundCheckType,
    data: { status: BackgroundCheckStatus; comments?: string; completedAt?: Date }
  ) {
    const existing = await prisma.backgroundCheck.findFirst({ where: { applicationId, checkType } })
    if (existing) return prisma.backgroundCheck.update({ where: { id: existing.id }, data })
    return prisma.backgroundCheck.create({ data: { applicationId, checkType, ...data } })
  }

  async function upsertOffer(
    applicationId: string,
    data: {
      positionId: string
      departmentId: string
      branchId: string
      contractType: ContractType
      bandId: string
      proposedStartDate: Date
      expiryDate: Date
      offerLetterUrl?: string
      status: OfferStatus
      sentAt?: Date
      respondedAt?: Date
      createdById: string
    }
  ) {
    const existing = await prisma.offer.findFirst({ where: { applicationId } })
    if (existing) return prisma.offer.update({ where: { id: existing.id }, data })
    return prisma.offer.create({ data: { applicationId, ...data } })
  }

  async function upsertOnboardingTask(
    applicationId: string,
    taskType: OnboardingTaskType,
    data: { isCompleted: boolean; completedAt?: Date; completedById?: string; notes?: string }
  ) {
    return prisma.onboardingTask.upsert({
      where: { applicationId_taskType: { applicationId, taskType } },
      update: data,
      create: { applicationId, taskType, ...data },
    })
  }

  // ---- Workforce Plan & Requisition -----------------------------------
  const plan = await upsertWorkforcePlan("Backend Developer Expansion — IT Channels", {
    departmentId: itDept.id,
    unitId: itChannels.id,
    branchId: headquartersBranch.id,
    hiringManagerId: claudine.employeeNumber,
    recruiterId: itHoD.employeeNumber,
    numberOfPositions: 2,
    employmentType: RecruitmentEmploymentType.FULL_TIME,
    priority: RecruitmentPriority.HIGH,
    expectedHiringDate: new Date("2026-08-15"),
    businessJustification: "IT Channels is expanding API capacity to support the new mobile banking rollout.",
    budget: 18_000_000,
    status: WorkforcePlanStatus.APPROVED,
    approvedById: md.employeeNumber,
    approvedAt: new Date("2026-06-02"),
  })

  const backendDevPosition = await upsertPosition({
    title: "Officer – Backend Developer",
    departmentId: itDept.id,
    unitId: itChannels.id,
    levelId: levelOfficer.id,
    reportsToPositionId: amApis.id,
  })

  const requisition = await upsertRequisition(plan.id, backendDevPosition.id, {
    departmentId: itDept.id,
    unitId: itChannels.id,
    functionId: techFunction.id,
    bandId: band3,
    reportsToPositionId: amApis.id,
    numberOfVacancies: 2,
    contractType: ContractType.PERMANENT,
    branchId: headquartersBranch.id,
    employmentType: RecruitmentEmploymentType.FULL_TIME,
    hiringReason: HiringReason.EXPANSION,
    requestedById: claudine.employeeNumber,
    hiringManagerId: claudine.employeeNumber,
    recruiterId: itHoD.employeeNumber,
    priority: RecruitmentPriority.HIGH,
    targetStartDate: new Date("2026-08-15"),
    status: RequisitionStatus.APPROVED,
    approvedById: md.employeeNumber,
    approvedAt: new Date("2026-06-10"),
  })

  const jobDescription = await upsertJobDescription("Backend Developer", {
    jobSummary: "Design, build and maintain the APIs and services behind NCBA Rwanda's digital channels.",
    keyResponsibilities:
      "Develop and maintain backend services; design APIs consumed by mobile/web channels; participate in code reviews; troubleshoot production issues.",
    requiredQualifications: "Bachelor's degree in Computer Science, Software Engineering or a related field.",
    requiredCertifications: null,
    requiredExperience: "2+ years building production backend services.",
    requiredSkills: "Node.js/TypeScript, SQL, REST API design, Git.",
    technicalCompetencies: "API design, relational databases, automated testing.",
    behaviouralCompetencies: "Ownership, attention to detail, collaborative.",
    requiredLevelId: levelOfficer.id,
    requiredBandId: band3,
    reportingManagerId: claudine.employeeNumber,
    workLocation: "Headquarters",
    isActive: true,
  })
  await prisma.jobRequisition.update({ where: { id: requisition.id }, data: { jobDescriptionId: jobDescription.id } })

  await upsertStage(requisition.id, RecruitmentStageName.WORKFORCE_PLANNING, {
    plannedStart: new Date("2026-05-20"),
    plannedEnd: new Date("2026-06-02"),
    actualStart: new Date("2026-05-20"),
    actualEnd: new Date("2026-06-02"),
    ownerId: itHoD.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.JOB_REQUISITION, {
    plannedStart: new Date("2026-06-02"),
    plannedEnd: new Date("2026-06-08"),
    actualStart: new Date("2026-06-02"),
    actualEnd: new Date("2026-06-08"),
    ownerId: claudine.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.JOB_DESCRIPTION, {
    plannedStart: new Date("2026-06-08"),
    plannedEnd: new Date("2026-06-10"),
    actualStart: new Date("2026-06-08"),
    actualEnd: new Date("2026-06-10"),
    ownerId: claudine.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.APPROVAL, {
    plannedStart: new Date("2026-06-10"),
    plannedEnd: new Date("2026-06-12"),
    actualStart: new Date("2026-06-10"),
    actualEnd: new Date("2026-06-10"),
    ownerId: md.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.JOB_POSTING, {
    plannedStart: new Date("2026-06-12"),
    plannedEnd: new Date("2026-06-14"),
    actualStart: new Date("2026-06-12"),
    actualEnd: new Date("2026-06-13"),
    ownerId: itHoD.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.APPLICATIONS, {
    plannedStart: new Date("2026-06-13"),
    plannedEnd: new Date("2026-06-27"),
    actualStart: new Date("2026-06-13"),
    actualEnd: new Date("2026-06-27"),
    ownerId: itHoD.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.SCREENING, {
    plannedStart: new Date("2026-06-27"),
    plannedEnd: new Date("2026-07-01"),
    actualStart: new Date("2026-06-27"),
    actualEnd: new Date("2026-07-01"),
    ownerId: claudine.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.ASSESSMENT, {
    plannedStart: new Date("2026-07-01"),
    plannedEnd: new Date("2026-07-05"),
    actualStart: new Date("2026-07-01"),
    actualEnd: new Date("2026-07-05"),
    ownerId: claudine.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.INTERVIEWS, {
    plannedStart: new Date("2026-07-05"),
    plannedEnd: new Date("2026-07-15"),
    actualStart: new Date("2026-07-05"),
    ownerId: itHoD.employeeNumber,
    status: StageStatus.IN_PROGRESS, // Bosco's interview is still scheduled
  })
  await upsertStage(requisition.id, RecruitmentStageName.BACKGROUND_CHECK, {
    plannedStart: new Date("2026-07-15"),
    plannedEnd: new Date("2026-07-20"),
    actualStart: new Date("2026-07-15"),
    actualEnd: new Date("2026-07-19"),
    ownerId: claudine.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.OFFER, {
    plannedStart: new Date("2026-07-20"),
    plannedEnd: new Date("2026-07-25"),
    actualStart: new Date("2026-07-20"),
    actualEnd: new Date("2026-07-24"),
    ownerId: itHoD.employeeNumber,
    status: StageStatus.COMPLETED,
  })
  await upsertStage(requisition.id, RecruitmentStageName.ONBOARDING, {
    plannedStart: new Date("2026-07-24"),
    plannedEnd: new Date("2026-08-15"),
    actualStart: new Date("2026-07-24"),
    ownerId: claudine.employeeNumber,
    status: StageStatus.IN_PROGRESS, // one of the two vacancies is still open
  })

  // ---- Job Posting -------------------------------------------------------
  const posting = await upsertJobPosting(requisition.id, {
    postingTitle: "Backend Developer – IT Channels",
    isInternal: true,
    isExternal: true,
    closingDate: new Date("2026-08-10"),
    description: "NCBA Rwanda is looking for a Backend Developer to join the IT Channels team.",
    responsibilities: "Build and maintain the APIs behind our digital banking channels.",
    qualifications: "Bachelor's in Computer Science or related field, 2+ years of backend experience.",
    branchId: headquartersBranch.id,
    employmentType: RecruitmentEmploymentType.FULL_TIME,
    requiredExperience: "2+ years",
    status: JobPostingStatus.PUBLISHED,
    publishedAt: new Date("2026-06-13"),
  })

  // ---- Candidates & Applications ------------------------------------------
  const alice = await upsertCandidate("alice.uwase@example.com", {
    firstName: "Alice",
    lastName: "Uwase",
    phone: "+250788900001",
    nationality: "Rwandan",
    cvUrl: "https://res.cloudinary.com/demo/alice-uwase-cv.pdf",
    education: "BSc Software Engineering, University of Rwanda",
    experience: "3 years as a backend developer at a fintech startup.",
    skills: "Node.js, TypeScript, PostgreSQL, REST APIs",
  })
  const bosco = await upsertCandidate("bosco.niyonzima@example.com", {
    firstName: "Bosco",
    lastName: "Niyonzima",
    phone: "+250788900002",
    nationality: "Rwandan",
    cvUrl: "https://res.cloudinary.com/demo/bosco-niyonzima-cv.pdf",
    education: "BSc Computer Science, University of Rwanda",
    experience: "2 years as a junior backend developer.",
    skills: "Node.js, SQL, Git",
  })

  const aliceApplication = await upsertApplication(alice.id, posting.id, {
    status: ApplicationStatus.HIRED,
    appliedAt: new Date("2026-06-15"),
  })
  const boscoApplication = await upsertApplication(bosco.id, posting.id, {
    status: ApplicationStatus.INTERVIEW,
    appliedAt: new Date("2026-06-18"),
  })

  await upsertScreening(aliceApplication.id, {
    decision: ScreeningDecision.SHORTLIST,
    comments: "Strong CV, relevant fintech backend experience.",
    screenedById: claudine.employeeNumber,
  })
  await upsertScreening(boscoApplication.id, {
    decision: ScreeningDecision.SHORTLIST,
    comments: "Good fundamentals, less production experience than Alice.",
    screenedById: claudine.employeeNumber,
  })

  await upsertAssessment(aliceApplication.id, AssessmentType.TECHNICAL_TEST, {
    scheduledDate: new Date("2026-07-02"),
    score: 88,
    maxScore: 100,
    result: AssessmentResult.PASS,
    evaluatorId: claudine.employeeNumber,
    comments: "Excellent grasp of API design and database fundamentals.",
  })
  await upsertAssessment(boscoApplication.id, AssessmentType.TECHNICAL_TEST, {
    scheduledDate: new Date("2026-07-03"),
    score: 71,
    maxScore: 100,
    result: AssessmentResult.PASS,
    evaluatorId: claudine.employeeNumber,
    comments: "Passed, some gaps in database design.",
  })

  await upsertInterview(
    aliceApplication.id,
    InterviewType.HR_INTERVIEW,
    [itHoD.employeeNumber],
    {
      interviewDate: new Date("2026-07-06"),
      location: "Headquarters — 3rd floor",
      notes: "Confident, strong communicator, culturally a good fit.",
      recommendation: InterviewRecommendation.HIRE,
      status: InterviewStatus.COMPLETED,
    }
  )
  await upsertInterview(
    aliceApplication.id,
    InterviewType.TECHNICAL_INTERVIEW,
    [itHoD.employeeNumber, claudine.employeeNumber],
    {
      interviewDate: new Date("2026-07-08"),
      location: "Headquarters — 3rd floor",
      notes: "Handled the system-design exercise very well.",
      recommendation: InterviewRecommendation.STRONG_HIRE,
      status: InterviewStatus.COMPLETED,
    }
  )
  await upsertInterview(
    boscoApplication.id,
    InterviewType.TECHNICAL_INTERVIEW,
    [claudine.employeeNumber],
    {
      interviewDate: new Date("2026-08-05"),
      location: "Headquarters — 3rd floor",
      status: InterviewStatus.SCHEDULED,
    }
  )

  await upsertBackgroundCheck(aliceApplication.id, BackgroundCheckType.EMPLOYMENT_VERIFICATION, {
    status: BackgroundCheckStatus.PASSED,
    comments: "Previous employer confirmed dates and role.",
    completedAt: new Date("2026-07-16"),
  })
  await upsertBackgroundCheck(aliceApplication.id, BackgroundCheckType.CRIMINAL_RECORD_CHECK, {
    status: BackgroundCheckStatus.PASSED,
    completedAt: new Date("2026-07-19"),
  })

  const aliceOffer = await upsertOffer(aliceApplication.id, {
    positionId: backendDevPosition.id,
    departmentId: itDept.id,
    branchId: headquartersBranch.id,
    contractType: ContractType.PERMANENT,
    bandId: band3,
    proposedStartDate: new Date("2026-08-15"),
    expiryDate: new Date("2026-07-30"),
    offerLetterUrl: "https://res.cloudinary.com/demo/alice-uwase-offer.pdf",
    status: OfferStatus.ACCEPTED,
    sentAt: new Date("2026-07-20"),
    respondedAt: new Date("2026-07-24"),
    createdById: itHoD.employeeNumber,
  })
  void aliceOffer

  // ---- Onboarding checklist — 8 of 9 items complete; the 9th
  // (EMPLOYEE_NUMBER_CREATED) is only ever completed by actually creating
  // the Employee record below. ---------------------------------------------
  const onboardingDoneBy = claudine.employeeNumber
  const onboardingDoneAt = new Date("2026-07-28")
  for (const taskType of [
    OnboardingTaskType.SYSTEM_ACCOUNTS_CREATED,
    OnboardingTaskType.ID_CARD_ISSUED,
    OnboardingTaskType.LAPTOP_ASSIGNED,
    OnboardingTaskType.WORKSPACE_ASSIGNED,
    OnboardingTaskType.MANDATORY_AML_TRAINING_ASSIGNED,
    OnboardingTaskType.HR_ORIENTATION_SCHEDULED,
    OnboardingTaskType.MANAGER_ORIENTATION_SCHEDULED,
    OnboardingTaskType.DOCUMENTS_SIGNED,
  ]) {
    await upsertOnboardingTask(aliceApplication.id, taskType, {
      isCompleted: true,
      completedAt: onboardingDoneAt,
      completedById: onboardingDoneBy,
    })
  }
  await upsertOnboardingTask(aliceApplication.id, OnboardingTaskType.EMPLOYEE_NUMBER_CREATED, {
    isCompleted: false,
  })

  // Bosco is still mid-pipeline — no offer, no onboarding tasks yet.

  // ---- Complete onboarding: create Alice as a real Employee ---------------
  const aliceEmployee = await upsertEmployee({
    employeeNumber: "EMP-0006",
    firstName: alice.firstName,
    lastName: alice.lastName,
    email: alice.email,
    gender: Gender.FEMALE,
    dateOfBirth: new Date("1996-04-14"),
    nationalIdNumber: "1199680012345676",
    nationality: alice.nationality,
    maritalStatus: MaritalStatus.SINGLE,
    phone: alice.phone,
    branchId: headquartersBranch.id,
    positionId: backendDevPosition.id,
    bandId: band3,
    employmentStartDate: new Date("2026-08-15"),
  })
  await prisma.employee.update({
    where: { employeeNumber: aliceEmployee.employeeNumber },
    data: { contractType: ContractType.PERMANENT, probationEndDate: new Date("2026-11-15") },
  })

  await prisma.application.update({
    where: { id: aliceApplication.id },
    data: { status: ApplicationStatus.HIRED, hiredEmployeeNumber: aliceEmployee.employeeNumber },
  })
  await upsertOnboardingTask(aliceApplication.id, OnboardingTaskType.EMPLOYEE_NUMBER_CREATED, {
    isCompleted: true,
    completedAt: onboardingDoneAt,
    completedById: onboardingDoneBy,
  })

  // eslint-disable-next-line no-console
  console.log(
    "Seeded Recruitment Management: workforce plan, requisition + timeline, job description, job posting, 2 candidates/applications spanning the full pipeline, and 1 completed hire (EMP-0006)."
  )
}

/**
 * Seeds 3 Form Categories (Employee/Recruitment/Compliance Forms, matching
 * the spec's own examples), 3 published Form Templates spanning single,
 * sequential-multi-stage and self-acknowledgement signature routing, and 4
 * Form Instances in different lifecycle states — ASSIGNED (not started),
 * IN_PROGRESS (draft responses, HR signer stage still unresolved),
 * PENDING_SIGNATURES (employee stage signed, manager stage waiting — proves
 * the sequential-stage gate), and COMPLETED (single-stage self-sign, fully
 * done). Signatures/responses are created directly via Prisma rather than
 * through FormInstancesService/FormSignaturesService, same as every other
 * seedX() function in this file. Idempotent — safe to re-run.
 */
async function seedFormsManagement(employees: {
  md: SeedEmployee
  itHoD: SeedEmployee
  claudine: SeedEmployee
  solange: SeedEmployee
  patrick: SeedEmployee
}) {
  const { md, itHoD, claudine, solange, patrick } = employees

  async function upsertFormCategory(name: string, description: string) {
    return prisma.formCategory.upsert({ where: { name }, update: { description }, create: { name, description } })
  }

  const employeeFormsCategory = await upsertFormCategory("Employee Forms", "General employee lifecycle and records forms.")
  const recruitmentFormsCategory = await upsertFormCategory("Recruitment Forms", "Forms used during hiring and onboarding.")
  const complianceFormsCategory = await upsertFormCategory("Compliance Forms", "Mandatory regulatory and policy acknowledgement forms.")
  const exitFormsCategory = await upsertFormCategory("Exit Forms", "Employee exit clearance and offboarding forms.")

  /** Only creates fields/stages on first insert — matches
   *  FormTemplatesService.assertStructurallyEditable's rule that a
   *  template's structure is frozen once instances exist, so a reseed must
   *  never try to touch fields/stages on an already-existing template. */
  async function upsertFormTemplate(
    formCode: string,
    data: {
      title: string
      description: string
      purpose?: string
      categoryId: string
      createdById: string
      fields: { fieldType: FieldType; label: string; helpText?: string; isRequired: boolean; order: number }[]
      stages: { stageOrder: number; role: SignerRole; label?: string }[]
    }
  ) {
    const templateInclude = { fields: { orderBy: { order: "asc" as const } }, signatureStages: { orderBy: { stageOrder: "asc" as const } } }

    const existing = await prisma.formTemplate.findUnique({ where: { formCode }, include: templateInclude })
    if (existing) return existing

    return prisma.formTemplate.create({
      data: {
        formCode,
        title: data.title,
        description: data.description,
        purpose: data.purpose,
        categoryId: data.categoryId,
        createdById: data.createdById,
        status: FormStatus.ACTIVE,
        fields: { create: data.fields },
        signatureStages: { create: data.stages },
      },
      include: templateInclude,
    })
  }

  // ---- Template 1: single MANAGER sign-off ------------------------------
  const infoUpdateTemplate = await upsertFormTemplate("FORM-0001", {
    title: "Employee Information Update Form",
    description: "Update your personal and contact information on file with HR.",
    purpose: "Keep employee records accurate and current.",
    categoryId: employeeFormsCategory.id,
    createdById: itHoD.employeeNumber,
    fields: [
      { fieldType: FieldType.SHORT_TEXT, label: "Current Phone Number", isRequired: true, order: 1 },
      { fieldType: FieldType.SHORT_TEXT, label: "Current Address", isRequired: true, order: 2 },
      { fieldType: FieldType.SHORT_TEXT, label: "Emergency Contact Name", isRequired: true, order: 3 },
      { fieldType: FieldType.SHORT_TEXT, label: "Emergency Contact Phone", isRequired: true, order: 4 },
    ],
    stages: [{ stageOrder: 1, role: SignerRole.MANAGER, label: "Manager Verification" }],
  })

  // ---- Template 2: sequential EMPLOYEE -> MANAGER -> HR -------------------
  const onboardingChecklistTemplate = await upsertFormTemplate("FORM-0002", {
    title: "New Hire Onboarding Checklist",
    description: "Confirms completion of onboarding requirements for new hires.",
    purpose: "Track and sign off each onboarding step.",
    categoryId: recruitmentFormsCategory.id,
    createdById: itHoD.employeeNumber,
    fields: [
      { fieldType: FieldType.CHECKBOX, label: "System Accounts Created", isRequired: true, order: 1 },
      { fieldType: FieldType.CHECKBOX, label: "ID Card Issued", isRequired: true, order: 2 },
      { fieldType: FieldType.CHECKBOX, label: "Workspace Assigned", isRequired: true, order: 3 },
      { fieldType: FieldType.COMMENTS, label: "Additional Notes", isRequired: false, order: 4 },
    ],
    stages: [
      { stageOrder: 1, role: SignerRole.EMPLOYEE, label: "Employee Confirmation" },
      { stageOrder: 2, role: SignerRole.MANAGER, label: "Manager Sign-off" },
      { stageOrder: 3, role: SignerRole.HR, label: "HR Final Approval" },
    ],
  })

  // ---- Template 3: single self-acknowledgement -----------------------------
  const codeOfConductTemplate = await upsertFormTemplate("FORM-0003", {
    title: "Code of Conduct Acknowledgement",
    description: "Annual acknowledgement of NCBA Rwanda's Code of Conduct policy.",
    purpose: "Confirm every employee has read and agrees to the Code of Conduct.",
    categoryId: complianceFormsCategory.id,
    createdById: itHoD.employeeNumber,
    fields: [
      { fieldType: FieldType.CHECKBOX, label: "I acknowledge and agree to comply with the Code of Conduct", isRequired: true, order: 1 },
    ],
    stages: [{ stageOrder: 1, role: SignerRole.EMPLOYEE, label: "Employee Acknowledgement" }],
  })

  // ---- Template 4: Exit Clearance Form (EMPLOYEE -> MANAGER -> HR) --------
  // Auto-assigned by ExitProcessService.initiateExit() when HR starts the
  // Exit Management process — see that service's EXIT_FORM_CODE constant,
  // which must match this formCode exactly.
  const exitFormTemplate = await upsertFormTemplate("FORM-0004", {
    title: "Exit Clearance Form",
    description: "Completed by an exiting employee as part of the Exit Management process, then signed off by their manager and HR.",
    purpose: "Confirm knowledge transfer, asset return, and access revocation before an employee's exit is finalized.",
    categoryId: exitFormsCategory.id,
    createdById: itHoD.employeeNumber,
    fields: [
      { fieldType: FieldType.SHORT_TEXT, label: "Handover Notes / Knowledge Transfer", isRequired: true, order: 1 },
      { fieldType: FieldType.CHECKBOX, label: "All Company Assets Returned (laptop, ID card, access card, etc.)", isRequired: true, order: 2 },
      { fieldType: FieldType.CHECKBOX, label: "Outstanding Loans/Advances Settled or Acknowledged", isRequired: true, order: 3 },
      { fieldType: FieldType.COMMENTS, label: "Additional Comments", isRequired: false, order: 4 },
    ],
    stages: [
      { stageOrder: 1, role: SignerRole.EMPLOYEE, label: "Employee Declaration" },
      { stageOrder: 2, role: SignerRole.MANAGER, label: "Manager Clearance" },
      { stageOrder: 3, role: SignerRole.HR, label: "HR Final Clearance" },
    ],
  })

  async function upsertFormInstance(params: {
    formTemplate: Awaited<ReturnType<typeof upsertFormTemplate>>
    employee: SeedEmployee
    assignedBy: SeedEmployee
    status: FormInstanceStatus
    dueDate?: Date
    priority?: FormPriority
    responses?: { fieldLabel: string; value: unknown }[]
    signatures: { stageOrder: number; signer: SeedEmployee | null; status: SignatureStatus; signedAt?: Date }[]
    submittedAt?: Date
    completedAt?: Date
  }) {
    const existing = await prisma.formInstance.findFirst({
      where: { formTemplateId: params.formTemplate.id, employeeId: params.employee.employeeNumber },
    })
    if (existing) return existing

    const instance = await prisma.formInstance.create({
      data: {
        formTemplateId: params.formTemplate.id,
        formVersion: params.formTemplate.version,
        employeeId: params.employee.employeeNumber,
        assignedById: params.assignedBy.employeeNumber,
        status: params.status,
        dueDate: params.dueDate,
        priority: params.priority ?? FormPriority.MEDIUM,
        submittedAt: params.submittedAt,
        completedAt: params.completedAt,
      },
    })

    for (const response of params.responses ?? []) {
      const field = params.formTemplate.fields.find((item) => item.label === response.fieldLabel)
      if (!field) continue
      await prisma.formFieldResponse.create({
        data: { formInstanceId: instance.id, formFieldId: field.id, value: response.value as Prisma.InputJsonValue },
      })
    }

    for (const signature of params.signatures) {
      const stage = params.formTemplate.signatureStages.find((item) => item.stageOrder === signature.stageOrder)
      if (!stage) continue
      await prisma.formSignature.create({
        data: {
          formInstanceId: instance.id,
          formSignatureStageId: stage.id,
          signerId: signature.signer?.employeeNumber ?? null,
          status: signature.status,
          signedAt: signature.signedAt,
        },
      })
    }

    await prisma.formAuditLog.create({
      data: { entityType: "FormInstance", entityId: instance.id, action: "ASSIGNED", actorId: params.assignedBy.employeeNumber, notes: "Seeded demo data" },
    })

    return instance
  }

  // Patrick — just assigned, hasn't started yet. Manager (Solange) auto-
  // resolved from the org chart, matching FormInstancesService.resolveSigner.
  await upsertFormInstance({
    formTemplate: infoUpdateTemplate,
    employee: patrick,
    assignedBy: itHoD,
    status: FormInstanceStatus.ASSIGNED,
    dueDate: new Date("2026-08-15"),
    signatures: [{ stageOrder: 1, signer: solange, status: SignatureStatus.PENDING }],
  })

  // Solange — in progress with draft responses saved; the HR stage's
  // signer is still null (unresolved) until she picks one before
  // submitting, per the "select required signatories" completion step.
  await upsertFormInstance({
    formTemplate: onboardingChecklistTemplate,
    employee: solange,
    assignedBy: itHoD,
    status: FormInstanceStatus.IN_PROGRESS,
    dueDate: new Date("2026-08-20"),
    responses: [
      { fieldLabel: "System Accounts Created", value: true },
      { fieldLabel: "ID Card Issued", value: true },
      { fieldLabel: "Workspace Assigned", value: false },
    ],
    signatures: [
      { stageOrder: 1, signer: solange, status: SignatureStatus.PENDING },
      { stageOrder: 2, signer: claudine, status: SignatureStatus.PENDING },
      { stageOrder: 3, signer: null, status: SignatureStatus.PENDING },
    ],
  })

  // Claudine — fully completed single-stage self-acknowledgement.
  const codeOfConductSignedAt = new Date("2026-07-15")
  await upsertFormInstance({
    formTemplate: codeOfConductTemplate,
    employee: claudine,
    assignedBy: itHoD,
    status: FormInstanceStatus.COMPLETED,
    submittedAt: codeOfConductSignedAt,
    completedAt: codeOfConductSignedAt,
    responses: [{ fieldLabel: "I acknowledge and agree to comply with the Code of Conduct", value: true }],
    signatures: [{ stageOrder: 1, signer: claudine, status: SignatureStatus.SIGNED, signedAt: codeOfConductSignedAt }],
  })

  // Eric (IT HoD) — submitted and awaiting his manager (the MD)'s
  // signature; HR stage still unresolved. Demonstrates the sequential-
  // stage gate: stage 2 only becomes actionable once stage 1 is SIGNED.
  const ericSubmittedAt = new Date("2026-07-22")
  await upsertFormInstance({
    formTemplate: onboardingChecklistTemplate,
    employee: itHoD,
    assignedBy: md,
    status: FormInstanceStatus.PENDING_SIGNATURES,
    submittedAt: ericSubmittedAt,
    responses: [
      { fieldLabel: "System Accounts Created", value: true },
      { fieldLabel: "ID Card Issued", value: true },
      { fieldLabel: "Workspace Assigned", value: true },
      { fieldLabel: "Additional Notes", value: "All onboarding steps completed ahead of schedule." },
    ],
    signatures: [
      { stageOrder: 1, signer: itHoD, status: SignatureStatus.SIGNED, signedAt: ericSubmittedAt },
      { stageOrder: 2, signer: md, status: SignatureStatus.PENDING },
      { stageOrder: 3, signer: null, status: SignatureStatus.PENDING },
    ],
  })

  // eslint-disable-next-line no-console
  console.log("Seeded Forms Management: 3 categories, 3 templates (single/sequential/self-sign routing), and 4 instances across ASSIGNED/IN_PROGRESS/PENDING_SIGNATURES/COMPLETED states.")
}

/**
 * Seeds the 7 default Sanction Types, then 5 disciplinary cases spanning
 * every lifecycle status (DRAFT, UNDER_INVESTIGATION with an open
 * investigation and a scheduled meeting, PENDING_DECISION confidential with
 * a completed investigation, SANCTION_ISSUED, and APPEALED with a pending
 * appeal), plus one fully CLOSED case with its sanction, and 2 grievances
 * in different states. Idempotent — safe to re-run, same as the rest of
 * this script.
 */
async function seedEmployeeRelations(employees: {
  md: SeedEmployee
  itHoD: SeedEmployee
  claudine: SeedEmployee
  solange: SeedEmployee
  patrick: SeedEmployee
}) {
  const { md, itHoD, claudine, solange, patrick } = employees

  // ---- Sanction types (HR-configurable) ------------------------------------
  const sanctionTypeDefs = [
    "Verbal Warning",
    "Written Warning",
    "Final Written Warning",
    "Suspension",
    "Demotion",
    "Salary Reduction",
    "Termination",
  ]
  const sanctionTypes = new Map<string, Awaited<ReturnType<typeof prisma.sanctionType.upsert>>>()
  for (const name of sanctionTypeDefs) {
    sanctionTypes.set(name, await prisma.sanctionType.upsert({ where: { name }, update: {}, create: { name } }))
  }
  const verbalWarning = sanctionTypes.get("Verbal Warning")!
  const writtenWarning = sanctionTypes.get("Written Warning")!

  async function upsertCase(
    caseNumber: string,
    data: {
      employeeId: string
      reportedById: string
      dateReported: Date
      incidentDate: Date
      incidentLocation?: string
      category: DisciplinaryCaseCategory
      subject: string
      description: string
      witnesses?: string[]
      investigationRequired: boolean
      status: DisciplinaryCaseStatus
      isConfidential?: boolean
      closedAt?: Date
    }
  ) {
    const existing = await prisma.disciplinaryCase.findUnique({ where: { caseNumber } })
    if (existing) return existing
    return prisma.disciplinaryCase.create({ data: { caseNumber, ...data } })
  }

  // ---- Case 1: Patrick — attendance, no investigation needed, closed with
  // a Verbal Warning. Demonstrates the full DRAFT -> ... -> CLOSED path. ----
  const patrickAttendanceCase = await upsertCase("ERC-2026-0001", {
    employeeId: patrick.employeeNumber,
    reportedById: solange.employeeNumber,
    dateReported: new Date("2026-06-02"),
    incidentDate: new Date("2026-05-28"),
    incidentLocation: "IT Channels — Headquarters",
    category: DisciplinaryCaseCategory.ATTENDANCE,
    subject: "Repeated late arrivals",
    description: "Patrick arrived more than 30 minutes late on 4 occasions over 2 weeks without prior notice.",
    investigationRequired: false,
    status: DisciplinaryCaseStatus.CLOSED,
    closedAt: new Date("2026-06-10"),
  })
  const existingSanction1 = await prisma.sanction.findFirst({ where: { disciplinaryCaseId: patrickAttendanceCase.id } })
  if (!existingSanction1) {
    await prisma.sanction.create({
      data: {
        disciplinaryCaseId: patrickAttendanceCase.id,
        employeeId: patrick.employeeNumber,
        sanctionTypeId: verbalWarning.id,
        dateOfSanction: new Date("2026-06-09"),
        reason: "Repeated unexcused late arrivals despite verbal reminders.",
        effectiveDate: new Date("2026-06-09"),
        issuedById: solange.employeeNumber,
        approvalAuthorityId: itHoD.employeeNumber,
        comments: "First-instance sanction — will escalate to Written Warning if the pattern continues.",
      },
    })
  }

  // ---- Case 2: Solange — misconduct, currently under investigation, with
  // a scheduled meeting. Demonstrates the active-investigation state and
  // the ERC_MEETING_SCHEDULED notification trigger. -------------------------
  const solangeMisconductCase = await upsertCase("ERC-2026-0002", {
    employeeId: solange.employeeNumber,
    reportedById: claudine.employeeNumber,
    dateReported: new Date("2026-07-05"),
    incidentDate: new Date("2026-07-02"),
    incidentLocation: "Kigali Heights Branch",
    category: DisciplinaryCaseCategory.MISCONDUCT,
    subject: "Unauthorized access to a colleague's workstation",
    description: "Solange was reported to have accessed a colleague's unlocked workstation without authorization.",
    witnesses: ["Officer – Channels Analyst (on shift)"],
    investigationRequired: true,
    status: DisciplinaryCaseStatus.UNDER_INVESTIGATION,
  })
  const existingInvestigation2 = await prisma.investigation.findFirst({ where: { disciplinaryCaseId: solangeMisconductCase.id } })
  if (!existingInvestigation2) {
    await prisma.investigation.create({
      data: {
        disciplinaryCaseId: solangeMisconductCase.id,
        investigatorId: claudine.employeeNumber,
        startDate: new Date("2026-07-06"),
        dueDate: new Date("2026-07-20"),
        status: "IN_PROGRESS",
      },
    })
  }
  const existingMeeting2 = await prisma.disciplinaryMeeting.findFirst({ where: { disciplinaryCaseId: solangeMisconductCase.id } })
  if (!existingMeeting2) {
    await prisma.disciplinaryMeeting.create({
      data: {
        disciplinaryCaseId: solangeMisconductCase.id,
        scheduledAt: new Date("2026-07-15T10:00:00Z"),
        location: "Headquarters — HR Conference Room",
        notes: "Initial disciplinary hearing.",
        createdById: claudine.employeeNumber,
      },
    })
  }

  // ---- Case 3: Claudine — confidential harassment case, investigation
  // completed, pending HR's decision. Demonstrates the confidentiality flag
  // (invisible to Claudine's own line manager, Eric/itHoD, despite him
  // being the investigator here — access is case-visibility, not
  // investigator-assignment, so this is intentionally still valid demo
  // data: the investigator role doesn't grant ongoing case visibility once
  // the case is marked confidential). ---------------------------------------
  const claudineHarassmentCase = await upsertCase("ERC-2026-0003", {
    employeeId: claudine.employeeNumber,
    reportedById: md.employeeNumber,
    dateReported: new Date("2026-06-20"),
    incidentDate: new Date("2026-06-18"),
    incidentLocation: "Headquarters",
    category: DisciplinaryCaseCategory.HARASSMENT,
    subject: "Workplace conduct complaint",
    description: "A confidential complaint was raised regarding Claudine's conduct towards a team member.",
    investigationRequired: true,
    status: DisciplinaryCaseStatus.PENDING_DECISION,
    isConfidential: true,
  })
  const existingInvestigation3 = await prisma.investigation.findFirst({ where: { disciplinaryCaseId: claudineHarassmentCase.id } })
  if (!existingInvestigation3) {
    await prisma.investigation.create({
      data: {
        disciplinaryCaseId: claudineHarassmentCase.id,
        investigatorId: itHoD.employeeNumber,
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-01"),
        dueDate: new Date("2026-07-05"),
        status: "COMPLETED",
        summary: "Interviews conducted with the complainant and two witnesses.",
        findings: "Findings support that the conduct occurred as described, though context was a factor.",
        recommendation: "A formal written warning is recommended, with a documented conduct improvement plan.",
      },
    })
  }

  // ---- Case 4: Patrick — policy violation, sanction issued (Written
  // Warning) and then appealed, appeal still pending review. ----------------
  const patrickPolicyCase = await upsertCase("ERC-2026-0004", {
    employeeId: patrick.employeeNumber,
    reportedById: solange.employeeNumber,
    dateReported: new Date("2026-05-10"),
    incidentDate: new Date("2026-05-08"),
    category: DisciplinaryCaseCategory.POLICY_VIOLATION,
    subject: "Breach of clean-desk policy",
    description: "Confidential customer documents were left unsecured on Patrick's desk overnight.",
    investigationRequired: false,
    status: DisciplinaryCaseStatus.APPEALED,
  })
  const existingSanction4 = await prisma.sanction.findFirst({ where: { disciplinaryCaseId: patrickPolicyCase.id } })
  if (!existingSanction4) {
    await prisma.sanction.create({
      data: {
        disciplinaryCaseId: patrickPolicyCase.id,
        employeeId: patrick.employeeNumber,
        sanctionTypeId: writtenWarning.id,
        dateOfSanction: new Date("2026-05-16"),
        reason: "Breach of the clean-desk policy involving confidential customer information.",
        effectiveDate: new Date("2026-05-16"),
        issuedById: solange.employeeNumber,
        approvalAuthorityId: itHoD.employeeNumber,
      },
    })
  }
  const existingAppeal4 = await prisma.appeal.findFirst({ where: { disciplinaryCaseId: patrickPolicyCase.id } })
  if (!existingAppeal4) {
    await prisma.appeal.create({
      data: {
        disciplinaryCaseId: patrickPolicyCase.id,
        employeeId: patrick.employeeNumber,
        appealDate: new Date("2026-05-20"),
        appealReason: "The documents were left briefly during an authorized client meeting, not overnight as stated.",
        status: "UNDER_REVIEW",
      },
    })
  }

  // ---- Case 5: Eric (IT HoD) — draft case, not yet submitted. -------------
  await upsertCase("ERC-2026-0005", {
    employeeId: itHoD.employeeNumber,
    reportedById: md.employeeNumber,
    dateReported: new Date("2026-07-24"),
    incidentDate: new Date("2026-07-22"),
    category: DisciplinaryCaseCategory.INSUBORDINATION,
    subject: "Disputed instruction from Executive Management",
    description: "Draft note pending review before formal submission.",
    investigationRequired: false,
    status: DisciplinaryCaseStatus.DRAFT,
  })

  // ---- Grievances -----------------------------------------------------------
  async function upsertGrievance(
    grievanceNumber: string,
    data: {
      employeeId: string
      dateSubmitted: Date
      subject: string
      description: string
      category: GrievanceCategory
      status: GrievanceStatus
      assignedToId?: string
      resolutionComments?: string
      resolvedAt?: Date
    }
  ) {
    const existing = await prisma.grievance.findUnique({ where: { grievanceNumber } })
    if (existing) return existing
    return prisma.grievance.create({ data: { grievanceNumber, ...data } })
  }

  await upsertGrievance("GRV-2026-0001", {
    employeeId: patrick.employeeNumber,
    dateSubmitted: new Date("2026-07-10"),
    subject: "Disagreement over shift allocation",
    description: "Patrick feels shift allocations have been unfairly distributed within the team.",
    category: GrievanceCategory.WORKPLACE_CONFLICT,
    status: GrievanceStatus.SUBMITTED,
  })

  await upsertGrievance("GRV-2026-0002", {
    employeeId: solange.employeeNumber,
    dateSubmitted: new Date("2026-06-01"),
    subject: "Band review request",
    description: "Solange requested a review of her band relative to peers with similar scope.",
    category: GrievanceCategory.COMPENSATION,
    status: GrievanceStatus.RESOLVED,
    assignedToId: itHoD.employeeNumber,
    resolutionComments: "Reviewed with HR — scheduled for the next band review cycle.",
    resolvedAt: new Date("2026-06-20"),
  })

  // eslint-disable-next-line no-console
  console.log(
    "Seeded Employee Relations: 7 sanction types, 5 disciplinary cases across Draft/Under Investigation/Pending Decision (confidential)/Appealed/Closed states, 2 sanctions, 1 appeal, and 2 grievances."
  )

  // ---- Email Notification Templates ----------------------------------------
  // One row per named email in the Email Notification & Automation spec.
  // isMandatory templates (welcome + AML reminder) can never be suppressed
  // via NotificationPreference — see EmailService.enqueue(). All bodies are
  // wrapped in a shared branded shell so HR can restyle every email at once
  // by editing this helper, rather than 35 near-duplicate <html> blocks.
  // The footer's {{hr_contact_phone}} doesn't need to be passed by every
  // call site — EmailService.enqueue() merges it (and any other future
  // shared/global variables) into every template's variables automatically,
  // sourced from HR_CONTACT_PHONE (see .env.example), before rendering.
  function emailShell(title: string, innerHtml: string) {
    return `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
  <div style="background:#0f4c81; padding: 20px 28px; border-radius: 6px 6px 0 0;">
    <span style="color:#ffffff; font-size: 18px; font-weight: bold;">NCBA Rwanda &mdash; PeopleSuite</span>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 28px; border-radius: 0 0 6px 6px;">
    <h2 style="margin-top:0; color:#0f4c81;">${title}</h2>
    ${innerHtml}
    <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">
      Questions? Contact NCBA Rwanda Human Resource at {{hr_contact_phone}}.<br />
      This is an automated message from NCBA Rwanda PeopleSuite &mdash; please do not reply directly to this email.
    </p>
  </div>
</div>`
  }

  const emailTemplateDefs: Array<{
    key: string
    name: string
    category: string
    subject: string
    bodyHtml: string
    variables: string[]
    isMandatory?: boolean
  }> = [
    // ---- Onboarding ----------------------------------------------------------
    {
      key: "employee_welcome",
      name: "Employee Welcome Email",
      category: "onboarding",
      subject: "Welcome to NCBA Rwanda, {{employee_name}}!",
      bodyHtml: emailShell(
        "Welcome to the team, {{employee_name}}!",
        `<p>We're delighted to confirm you're now an active employee of NCBA Rwanda.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:4px 0; color:#6b7280;">Employee Number</td><td style="padding:4px 0; font-weight:bold;">{{employee_number}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Department</td><td style="padding:4px 0; font-weight:bold;">{{department}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Position</td><td style="padding:4px 0; font-weight:bold;">{{position}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Start Date</td><td style="padding:4px 0; font-weight:bold;">{{start_date}}</td></tr>
        </table>
        <p><a href="{{login_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Log in to PeopleSuite</a></p>
        <p>Your temporary login details:</p>
        <p>Username: <strong>{{username}}</strong><br />Temporary Password: <strong>{{temporary_password}}</strong></p>
        <p>For security, you'll be asked to change this password and accept the Terms of Use the first time you log in.</p>`
      ),
      variables: ["employee_name", "employee_number", "department", "position", "start_date", "login_url", "username", "temporary_password", "hr_contact_phone"],
      isMandatory: true,
    },

    // ---- Leave -----------------------------------------------------------------
    {
      key: "leave_submitted",
      name: "Leave Request Submitted",
      category: "leave",
      subject: "Your leave request has been submitted",
      bodyHtml: emailShell(
        "Leave request submitted",
        `<p>Hi {{employee_name}}, your {{leave_type}} request for {{start_date}} to {{end_date}} ({{days}} day(s)) has been submitted and is awaiting approval from {{approver_name}}.</p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "days", "approver_name"],
    },
    {
      key: "leave_approval_needed",
      name: "Leave Approval Needed (Manager)",
      category: "leave",
      subject: "Leave request awaiting your approval — {{employee_name}}",
      bodyHtml: emailShell(
        "A leave request needs your decision",
        `<p>{{employee_name}} has requested {{leave_type}} leave from {{start_date}} to {{end_date}} ({{days}} day(s)).</p>
        <p><a href="{{approval_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review request</a></p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "days", "approval_url"],
    },
    {
      key: "leave_approved",
      name: "Leave Request Approved",
      category: "leave",
      subject: "Your leave request was approved",
      bodyHtml: emailShell(
        "Leave approved",
        `<p>Good news, {{employee_name}} — your {{leave_type}} request for {{start_date}} to {{end_date}} has been approved by {{approver_name}}.</p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "approver_name"],
    },
    {
      key: "leave_rejected",
      name: "Leave Request Rejected",
      category: "leave",
      subject: "Your leave request was not approved",
      bodyHtml: emailShell(
        "Leave request rejected",
        `<p>Hi {{employee_name}}, your {{leave_type}} request for {{start_date}} to {{end_date}} was not approved by {{approver_name}}.</p>
        <p>Reason: {{decision_comment}}</p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "approver_name", "decision_comment"],
    },
    {
      key: "leave_cancelled",
      name: "Leave Request Cancelled",
      category: "leave",
      subject: "Leave request cancelled — {{employee_name}}",
      bodyHtml: emailShell(
        "Leave request cancelled",
        `<p>{{employee_name}}'s {{leave_type}} request for {{start_date}} to {{end_date}} has been cancelled.</p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date"],
    },
    {
      key: "leave_low_balance",
      name: "Low Leave Balance Alert",
      category: "leave",
      subject: "Your {{leave_type}} balance is running low",
      bodyHtml: emailShell(
        "Low leave balance",
        `<p>Hi {{employee_name}}, your remaining {{leave_type}} balance is now {{balance_days}} day(s). Plan ahead if you have time off coming up.</p>`
      ),
      variables: ["employee_name", "leave_type", "balance_days"],
    },
    {
      key: "leave_carry_forward_expiring",
      name: "Carry-Forward Leave Expiring",
      category: "leave",
      subject: "{{carry_forward_days}} carried-forward day(s) expire on {{expiry_date}}",
      bodyHtml: emailShell(
        "Carried-forward leave is expiring soon",
        `<p>Hi {{employee_name}}, you have {{carry_forward_days}} day(s) of carried-forward {{leave_type}} leave that will expire on {{expiry_date}}. Use them before they're forfeited.</p>`
      ),
      variables: ["employee_name", "leave_type", "carry_forward_days", "expiry_date"],
    },

    // ---- Performance -------------------------------------------------------
    {
      key: "performance_self_appraisal_open",
      name: "Self-Appraisal Now Open",
      category: "performance",
      subject: "{{review_period}} self-appraisal is now open",
      bodyHtml: emailShell(
        "Self-appraisal is open",
        `<p>Hi {{employee_name}}, the {{review_period}} review period is open. Please complete your self-appraisal by {{deadline}}.</p>
        <p><a href="{{review_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Start self-appraisal</a></p>`
      ),
      variables: ["employee_name", "review_period", "deadline", "review_url"],
    },
    {
      key: "performance_reminder_14_days",
      name: "Appraisal Reminder — 14 Days Left",
      category: "performance",
      subject: "Reminder: {{review_period}} appraisal due in 14 days",
      bodyHtml: emailShell(
        "14 days left to complete your appraisal",
        `<p>Hi {{employee_name}}, your {{review_period}} appraisal is due on {{deadline}} — that's 14 days from now.</p>`
      ),
      variables: ["employee_name", "review_period", "deadline"],
    },
    {
      key: "performance_reminder_7_days",
      name: "Appraisal Reminder — 7 Days Left",
      category: "performance",
      subject: "Reminder: {{review_period}} appraisal due in 7 days",
      bodyHtml: emailShell("7 days left to complete your appraisal", `<p>Hi {{employee_name}}, your {{review_period}} appraisal is due on {{deadline}}.</p>`),
      variables: ["employee_name", "review_period", "deadline"],
    },
    {
      key: "performance_reminder_1_day",
      name: "Appraisal Reminder — 1 Day Left",
      category: "performance",
      subject: "Final reminder: {{review_period}} appraisal due tomorrow",
      bodyHtml: emailShell("Due tomorrow", `<p>Hi {{employee_name}}, your {{review_period}} appraisal is due tomorrow ({{deadline}}).</p>`),
      variables: ["employee_name", "review_period", "deadline"],
    },
    {
      key: "performance_overdue",
      name: "Appraisal Overdue",
      category: "performance",
      subject: "Overdue: {{review_period}} appraisal",
      bodyHtml: emailShell(
        "Your appraisal is now overdue",
        `<p>Hi {{employee_name}}, your {{review_period}} appraisal was due on {{deadline}} and has not yet been submitted. Please complete it as soon as possible.</p>`
      ),
      variables: ["employee_name", "review_period", "deadline"],
    },
    {
      key: "performance_manager_reminder",
      name: "Manager Appraisal Reminder",
      category: "performance",
      subject: "Reminder: appraisal(s) awaiting your review",
      bodyHtml: emailShell(
        "Appraisals awaiting your review",
        `<p>Hi {{manager_name}}, {{pending_count}} appraisal(s) in the {{review_period}} cycle are awaiting your review.</p>`
      ),
      variables: ["manager_name", "review_period", "pending_count"],
    },

    // ---- Learning & Development ---------------------------------------------
    {
      key: "learning_course_assigned",
      name: "Course Assigned",
      category: "learning",
      subject: "You've been assigned: {{course_name}}",
      bodyHtml: emailShell(
        "New course assigned",
        `<p>Hi {{employee_name}}, you've been assigned "{{course_name}}", due by {{due_date}}.</p>
        <p><a href="{{course_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Start course</a></p>`
      ),
      variables: ["employee_name", "course_name", "due_date", "course_url"],
    },
    {
      key: "learning_not_started_reminder",
      name: "Course Not Started Reminder",
      category: "learning",
      subject: "Reminder: {{course_name}} not yet started",
      bodyHtml: emailShell("You haven't started this course yet", `<p>Hi {{employee_name}}, "{{course_name}}" is due by {{due_date}} and hasn't been started.</p>`),
      variables: ["employee_name", "course_name", "due_date"],
    },
    {
      key: "learning_approaching_deadline",
      name: "Course Deadline Approaching",
      category: "learning",
      subject: "{{course_name}} is due soon",
      bodyHtml: emailShell("Deadline approaching", `<p>Hi {{employee_name}}, "{{course_name}}" is due on {{due_date}}.</p>`),
      variables: ["employee_name", "course_name", "due_date"],
    },
    {
      key: "learning_overdue",
      name: "Course Overdue",
      category: "learning",
      subject: "Overdue: {{course_name}}",
      bodyHtml: emailShell("This course is now overdue", `<p>Hi {{employee_name}}, "{{course_name}}" was due on {{due_date}} and is now overdue.</p>`),
      variables: ["employee_name", "course_name", "due_date"],
    },
    {
      key: "learning_aml_mandatory_reminder",
      name: "Mandatory AML Training Reminder",
      category: "learning",
      subject: "Action required: {{course_name}} (mandatory compliance training)",
      bodyHtml: emailShell(
        "Mandatory compliance training reminder",
        `<p>Hi {{employee_name}}, "{{course_name}}" is mandatory AML/compliance training due by {{due_date}}. This reminder cannot be disabled.</p>`
      ),
      variables: ["employee_name", "course_name", "due_date"],
      isMandatory: true,
    },

    // ---- Recruitment ---------------------------------------------------------
    {
      key: "recruitment_application_received",
      name: "Application Received",
      category: "recruitment",
      subject: "We've received your application — {{job_title}}",
      bodyHtml: emailShell(
        "Application received",
        `<p>Hi {{candidate_name}}, thank you for applying for {{job_title}} at NCBA Rwanda. Our recruitment team will review your application and be in touch.</p>`
      ),
      variables: ["candidate_name", "job_title"],
    },
    {
      key: "recruitment_interview_invitation",
      name: "Interview Invitation",
      category: "recruitment",
      subject: "Interview invitation — {{job_title}}",
      bodyHtml: emailShell(
        "You're invited to interview",
        `<p>Hi {{candidate_name}}, we'd like to invite you to interview for {{job_title}} on {{interview_date}} at {{interview_time}} ({{interview_mode}}).</p>`
      ),
      variables: ["candidate_name", "job_title", "interview_date", "interview_time", "interview_mode"],
    },
    {
      key: "recruitment_assessment_invitation",
      name: "Assessment Invitation",
      category: "recruitment",
      subject: "Assessment invitation — {{job_title}}",
      bodyHtml: emailShell(
        "Please complete your assessment",
        `<p>Hi {{candidate_name}}, as part of your application for {{job_title}}, please complete the following assessment by {{deadline}}.</p>
        <p><a href="{{assessment_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Start assessment</a></p>`
      ),
      variables: ["candidate_name", "job_title", "deadline", "assessment_url"],
    },
    {
      key: "recruitment_offer_letter",
      name: "Offer Letter",
      category: "recruitment",
      subject: "Your offer from NCBA Rwanda — {{job_title}}",
      bodyHtml: emailShell(
        "Congratulations!",
        `<p>Hi {{candidate_name}}, we're pleased to offer you the position of {{job_title}}. Please find your offer letter attached / linked below.</p>
        <p><a href="{{offer_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View offer</a></p>`
      ),
      variables: ["candidate_name", "job_title", "offer_url"],
    },
    {
      key: "recruitment_rejection",
      name: "Application Not Successful",
      category: "recruitment",
      subject: "Update on your application — {{job_title}}",
      bodyHtml: emailShell(
        "Application update",
        `<p>Hi {{candidate_name}}, thank you for your interest in {{job_title}}. After careful consideration, we've decided not to move forward with your application at this time. We wish you the best in your search.</p>`
      ),
      variables: ["candidate_name", "job_title"],
    },
    {
      key: "recruitment_recruiter_new_application",
      name: "New Application (Recruiter)",
      category: "recruitment",
      subject: "New application — {{job_title}}",
      bodyHtml: emailShell("New application received", `<p>{{candidate_name}} has applied for {{job_title}}.</p>`),
      variables: ["candidate_name", "job_title"],
    },
    {
      key: "recruitment_interview_scheduled_recruiter",
      name: "Interview Scheduled (Recruiter)",
      category: "recruitment",
      subject: "Interview scheduled — {{candidate_name}} for {{job_title}}",
      bodyHtml: emailShell(
        "Interview scheduled",
        `<p>An interview for {{candidate_name}} ({{job_title}}) has been scheduled for {{interview_date}} at {{interview_time}}.</p>`
      ),
      variables: ["candidate_name", "job_title", "interview_date", "interview_time"],
    },

    // ---- Exit Management -----------------------------------------------------
    {
      key: "exit_form_assigned",
      name: "Exit Form Assigned",
      category: "exit",
      subject: "Action required: exit form",
      bodyHtml: emailShell(
        "Exit form assigned",
        `<p>Hi {{employee_name}}, following your exit process (last working day {{last_working_day}}), please complete the exit form below.</p>
        <p><a href="{{form_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Complete exit form</a></p>`
      ),
      variables: ["employee_name", "last_working_day", "form_url"],
    },
    {
      key: "exit_clearance_checklist",
      name: "Exit Clearance Checklist",
      category: "exit",
      subject: "Your exit clearance checklist",
      bodyHtml: emailShell(
        "Clearance checklist",
        `<p>Hi {{employee_name}}, please complete the clearance checklist items below before your last working day ({{last_working_day}}).</p>`
      ),
      variables: ["employee_name", "last_working_day"],
    },
    {
      key: "exit_interview_invitation",
      name: "Exit Interview Invitation",
      category: "exit",
      subject: "Exit interview scheduled",
      bodyHtml: emailShell(
        "Exit interview",
        `<p>Hi {{employee_name}}, your exit interview has been scheduled for {{interview_date}} at {{interview_time}}.</p>`
      ),
      variables: ["employee_name", "interview_date", "interview_time"],
    },
    {
      key: "exit_manager_approval_task",
      name: "Exit Task Awaiting Manager Approval",
      category: "exit",
      subject: "Action needed: exit clearance for {{employee_name}}",
      bodyHtml: emailShell(
        "Exit clearance awaiting your approval",
        `<p>Hi {{manager_name}}, {{employee_name}}'s exit clearance item ({{task_name}}) is awaiting your sign-off.</p>`
      ),
      variables: ["manager_name", "employee_name", "task_name"],
    },
    {
      key: "exit_hr_workflow_update",
      name: "Exit Workflow Update (HR)",
      category: "exit",
      subject: "Exit workflow update — {{employee_name}}",
      bodyHtml: emailShell("Exit workflow update", `<p>{{employee_name}}'s exit process status changed to {{status}}.</p>`),
      variables: ["employee_name", "status"],
    },

    // ---- Employee Relations ---------------------------------------------------
    {
      key: "erc_meeting_invitation",
      name: "Disciplinary Meeting Invitation",
      category: "employee-relations",
      subject: "{{meeting_subject}}",
      bodyHtml: emailShell(
        "{{meeting_subject}}",
        `<p>Hi {{invitee_name}}, {{organizer_name}} has invited you to a meeting.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:4px 0; color:#6b7280;">Date</td><td style="padding:4px 0; font-weight:bold;">{{meeting_date}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Time</td><td style="padding:4px 0; font-weight:bold;">{{meeting_time}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Location</td><td style="padding:4px 0; font-weight:bold;">{{meeting_location}}</td></tr>
        </table>
        <p>{{meeting_description}}</p>`
      ),
      variables: ["invitee_name", "organizer_name", "meeting_subject", "meeting_description", "meeting_date", "meeting_time", "meeting_location"],
    },

    // ---- Generic Approvals (Leave / Recruitment / Forms / Training / Performance / Employee changes) ----
    {
      key: "approval_required",
      name: "Approval Required",
      category: "approval",
      subject: "Approval required: {{item_title}}",
      bodyHtml: emailShell(
        "Your approval is needed",
        `<p>Hi {{approver_name}}, "{{item_title}}" ({{item_type}}) requires your approval.</p>
        <p><a href="{{approval_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review now</a></p>`
      ),
      variables: ["approver_name", "item_title", "item_type", "approval_url"],
    },
    {
      key: "approval_completed",
      name: "Approval Completed",
      category: "approval",
      subject: "Approved: {{item_title}}",
      bodyHtml: emailShell("Approved", `<p>Hi {{requester_name}}, "{{item_title}}" ({{item_type}}) has been approved by {{approver_name}}.</p>`),
      variables: ["requester_name", "item_title", "item_type", "approver_name"],
    },
    {
      key: "approval_rejected",
      name: "Approval Rejected",
      category: "approval",
      subject: "Rejected: {{item_title}}",
      bodyHtml: emailShell(
        "Not approved",
        `<p>Hi {{requester_name}}, "{{item_title}}" ({{item_type}}) was rejected by {{approver_name}}. Reason: {{decision_comment}}</p>`
      ),
      variables: ["requester_name", "item_title", "item_type", "approver_name", "decision_comment"],
    },
    {
      key: "approval_returned_for_correction",
      name: "Returned for Correction",
      category: "approval",
      subject: "Please review: {{item_title}} was returned for correction",
      bodyHtml: emailShell(
        "Returned for correction",
        `<p>Hi {{requester_name}}, "{{item_title}}" ({{item_type}}) was returned by {{approver_name}} for correction. Notes: {{decision_comment}}</p>`
      ),
      variables: ["requester_name", "item_title", "item_type", "approver_name", "decision_comment"],
    },
  ]

  for (const def of emailTemplateDefs) {
    await prisma.emailTemplate.upsert({
      where: { key: def.key },
      update: {},
      create: {
        key: def.key,
        name: def.name,
        category: def.category,
        subject: def.subject,
        bodyHtml: def.bodyHtml,
        variables: def.variables,
        isMandatory: def.isMandatory ?? false,
        createdById: md.employeeNumber,
      },
    })
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded Email Notification Templates: ${emailTemplateDefs.length} templates across onboarding/leave/performance/learning/recruitment/exit/employee-relations/approval categories.`)

  // ---- Professional Profile module: starter catalogs -----------------------
  // A handful of real institutions/skills so the searchable dropdowns in the
  // Education/Skills sections have something to match against out of the
  // box — HR (or employees, for skills) grow both lists over time.
  const institutionDefs: { name: string; country: string; city?: string; website?: string }[] = [
    { name: "University of Rwanda", country: "Rwanda", city: "Kigali", website: "https://ur.ac.rw" },
    { name: "Rwanda Polytechnic", country: "Rwanda", city: "Kigali", website: "https://rp.ac.rw" },
    { name: "Carnegie Mellon University Africa", country: "Rwanda", city: "Kigali", website: "https://africa.cmu.edu" },
    { name: "African Leadership University", country: "Rwanda", city: "Kigali", website: "https://alueducation.com" },
    { name: "Kepler Rwanda", country: "Rwanda", city: "Kigali" },
    { name: "Mount Kenya University Rwanda", country: "Rwanda", city: "Kigali" },
    { name: "University of Nairobi", country: "Kenya", city: "Nairobi", website: "https://uonbi.ac.ke" },
    { name: "Strathmore University", country: "Kenya", city: "Nairobi", website: "https://strathmore.edu" },
    { name: "Makerere University", country: "Uganda", city: "Kampala", website: "https://mak.ac.ug" },
    { name: "University of Cape Town", country: "South Africa", city: "Cape Town", website: "https://uct.ac.za" },
    { name: "University of London", country: "United Kingdom", city: "London", website: "https://london.ac.uk" },
    { name: "University of Manchester", country: "United Kingdom", city: "Manchester", website: "https://manchester.ac.uk" },
    { name: "Harvard University", country: "United States", city: "Cambridge", website: "https://harvard.edu" },
    { name: "Massachusetts Institute of Technology", country: "United States", city: "Cambridge", website: "https://mit.edu" },
    { name: "University of Toronto", country: "Canada", city: "Toronto", website: "https://utoronto.ca" },
  ]
  for (const def of institutionDefs) {
    // AcademicInstitution.name isn't @unique (the same institution name can
    // legitimately appear once per country), so this is a plain
    // find-then-create rather than a Prisma upsert.
    const existing = await prisma.academicInstitution.findFirst({ where: { name: def.name, country: def.country } })
    if (!existing) {
      await prisma.academicInstitution.create({ data: { ...def, verificationStatus: "VERIFIED" } })
    }
  }

  const skillDefs: { name: string; category: string }[] = [
    { name: "JavaScript", category: "Technical" },
    { name: "TypeScript", category: "Technical" },
    { name: "Python", category: "Technical" },
    { name: "SQL", category: "Technical" },
    { name: "Cloud Computing", category: "Technical" },
    { name: "Data Analysis", category: "Technical" },
    { name: "Cybersecurity", category: "Technical" },
    { name: "Network Administration", category: "Technical" },
    { name: "Core Banking Systems", category: "Technical" },
    { name: "Digital Banking", category: "Technical" },
    { name: "Anti-Money Laundering (AML)", category: "Technical" },
    { name: "Credit Risk Analysis", category: "Technical" },
    { name: "Leadership", category: "Professional" },
    { name: "Communication", category: "Professional" },
    { name: "Project Management", category: "Professional" },
    { name: "Negotiation", category: "Professional" },
    { name: "Customer Relationship Management", category: "Professional" },
    { name: "Strategic Planning", category: "Professional" },
    { name: "Team Management", category: "Professional" },
    { name: "Public Speaking", category: "Professional" },
  ]
  for (const def of skillDefs) {
    await prisma.skill.upsert({ where: { name: def.name }, update: {}, create: def })
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded Professional Profile catalogs: ${institutionDefs.length} institutions, ${skillDefs.length} skills.`)
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
