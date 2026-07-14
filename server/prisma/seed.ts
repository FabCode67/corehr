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
  ContractType,
  Gender,
  LeaveCategory,
  LeaveEntitlementCategory,
  LeaveRequestStatus,
  MaritalStatus,
  PositionChangeType,
  PositionTrack,
  PrismaClient,
  WorkLocation,
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
  return prisma.positionLevel.upsert({
    where: { name },
    update: { rank, track, code },
    create: { name, rank, track, code },
  })
}

async function upsertBand(name: string, rank: number) {
  return prisma.band.upsert({
    where: { name },
    update: { rank },
    create: { name, rank },
  })
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
  workLocation: WorkLocation
  positionId: string
  bandId: string
  employmentStartDate: Date
  isAdmin?: boolean
}) {
  const { positionId, bandId, employmentStartDate, isAdmin = false, ...basics } = params

  // Re-running the seed resets every demo employee's password back to the
  // default and re-applies isAdmin — convenient for getting back into a
  // known-good demo state after messing with a login locally.
  const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10)

  const employee = await prisma.employee.upsert({
    where: { employeeNumber: params.employeeNumber },
    update: { positionId, bandId, employmentStartDate, passwordHash, isAdmin },
    create: { ...basics, positionId, bandId, employmentStartDate, passwordHash, isAdmin },
  })

  // The seed calls Prisma directly (not EmployeesService), so — same as the
  // service's own assign-position step — make sure the first assignment
  // leaves behind an INITIAL_HIRE PositionHistory row.
  const hasHistory = await prisma.positionHistory.findFirst({
    where: { employeeId: employee.id },
  })
  if (!hasHistory) {
    await prisma.positionHistory.create({
      data: {
        employeeId: employee.id,
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
  // Codes follow "lower number = more senior" within each track — F1 is
  // the most senior standard role (Head of Department), E1 is the most
  // senior overall (Managing Director). Purely presentational (org-chart
  // badges); see PositionLevel.code in schema.prisma.
  const levelIntern = await upsertLevel("Intern", 1, "STANDARD", "F7")
  const levelOfficer = await upsertLevel("Officer", 2, "STANDARD", "F6")
  await upsertLevel("Senior Officer", 3, "STANDARD", "F5")
  const levelAssistantManager = await upsertLevel("Assistant Manager", 4, "STANDARD", "F4")
  const levelManager = await upsertLevel("Manager", 5, "STANDARD", "F3")
  const levelSeniorManager = await upsertLevel("Senior Manager", 6, "STANDARD", "F2")
  const levelHoD = await upsertLevel("Head of Department", 7, "STANDARD", "F1")
  const levelMD = await upsertLevel("Managing Director", 8, "EXECUTIVE", "E1")
  const levelCEO = await upsertLevel("Chief Executive Officer", 9, "EXECUTIVE", "E2")
  const levelCOO = await upsertLevel("Chief Operating Officer", 10, "EXECUTIVE", "E3")
  const levelCTO = await upsertLevel("Chief Technology Officer", 11, "EXECUTIVE", "E4")
  const levelCFO = await upsertLevel("Chief Financial Officer", 12, "EXECUTIVE", "E5")
  await upsertLevel("Other Executive", 13, "EXECUTIVE", "E6")
  void levelIntern // reserved for future Intern positions; not used in this seed

  // ---- Bands (1..10) -------------------------------------------------------
  const bands = new Map<number, Awaited<ReturnType<typeof upsertBand>>>()
  for (let i = 1; i <= 10; i++) {
    bands.set(i, await upsertBand(`Band ${i}`, i))
  }

  // ---- Functions & Departments ---------------------------------------------
  const execFunction = await upsertFunction("Executive Management")
  const execDept = await upsertDepartment(execFunction.id, "Executive Management")

  const techFunction = await upsertFunction("Technology Function")
  const itDept = await upsertDepartment(techFunction.id, "Information Technology")

  const supportFunction = await upsertFunction("Support Functions")
  const hrDept = await upsertDepartment(supportFunction.id, "Human Resources")
  await upsertDepartment(supportFunction.id, "Finance")

  const businessFunction = await upsertFunction("Business Function")
  await upsertDepartment(businessFunction.id, "Retail Banking")
  await upsertDepartment(businessFunction.id, "Corporate Banking")

  await upsertFunction("Risk & Compliance")
  await upsertFunction("Security Functions")

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
    workLocation: WorkLocation.HEADQUARTERS,
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
    workLocation: WorkLocation.HEADQUARTERS,
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
    workLocation: WorkLocation.HEADQUARTERS,
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
    workLocation: WorkLocation.KIGALI_HEIGHTS_BRANCH,
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
    workLocation: WorkLocation.KIGALI_HEIGHTS_BRANCH,
    positionId: officerChannelsAnalyst.id,
    bandId: bands.get(3)!.id,
    employmentStartDate,
  })

  // Give the demo employees Employment Details so Leave Management has a
  // contract type to resolve entitlement categories from.
  for (const employee of [md_employee, itHoD_employee, claudine_employee, solange_employee, patrick_employee]) {
    await prisma.employee.update({
      where: { id: employee.id },
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

  // eslint-disable-next-line no-console
  console.log("Seed complete: org structure + 5 demo employees + Leave Management config & demo data.")
  // eslint-disable-next-line no-console
  console.log(
    "Try: GET /api/organization/org-chart, GET /api/employees/{Patrick's id}/reporting-manager, GET /api/leave/balances/employee/{Patrick's id}"
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
      where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: leaveType.id, year } },
      update: { entitledDays },
      create: { employeeId: employee.id, leaveTypeId: leaveType.id, year, entitledDays },
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
      where: { employeeId: employee.id, leaveTypeId: leaveType.id, startDate: start },
    })
    if (existing) return existing

    const currentStepOrder =
      status === "APPROVED" || status === "REJECTED" || status === "CANCELLED"
        ? null
        : stepsApproved + 1

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
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
            approverEmployeeId: index < stepsApproved ? employee.id : null, // demo data only
            decidedAt: index < stepsApproved ? new Date() : null,
          })),
        },
      },
    })

    // Reflect the request on the balance: APPROVED books takenDays,
    // anything still open reserves pendingDays.
    const balanceWhere = {
      employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: leaveType.id, year },
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

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
