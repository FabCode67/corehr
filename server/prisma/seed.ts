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
import { PositionTrack, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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
  positionId: string
  bandId: string
  hireDate: Date
}) {
  return prisma.employee.upsert({
    where: { employeeNumber: params.employeeNumber },
    update: {
      positionId: params.positionId,
      bandId: params.bandId,
    },
    create: params,
  })
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
  const levelCOO = await upsertLevel("Chief Operating Officer", 10, "EXECUTIVE", "E2")
  const levelCTO = await upsertLevel("Chief Technology Officer", 11, "EXECUTIVE", "E2")
  const levelCFO = await upsertLevel("Chief Financial Officer", 12, "EXECUTIVE", "E2")
  await upsertLevel("Other Executive", 13, "EXECUTIVE", "E3")
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
  const hireDate = new Date("2020-01-06")

  const md_employee = await upsertEmployee({
    employeeNumber: "EMP-0001",
    firstName: "Jean-Paul",
    lastName: "Mugisha",
    email: "jp.mugisha@ncbarwanda.com",
    positionId: md.id,
    bandId: bands.get(10)!.id,
    hireDate,
  })
  const itHoD_employee = await upsertEmployee({
    employeeNumber: "EMP-0002",
    firstName: "Eric",
    lastName: "Ndayisenga",
    email: "e.ndayisenga@ncbarwanda.com",
    positionId: itHoD.id,
    bandId: bands.get(8)!.id,
    hireDate,
  })
  await upsertEmployee({
    employeeNumber: "EMP-0003",
    firstName: "Claudine",
    lastName: "Umutoni",
    email: "c.umutoni@ncbarwanda.com",
    positionId: itChannelsSrMgr.id,
    bandId: bands.get(6)!.id,
    hireDate,
  })
  await upsertEmployee({
    employeeNumber: "EMP-0004",
    firstName: "Solange",
    lastName: "Ingabire",
    email: "s.ingabire@ncbarwanda.com",
    positionId: amChannels.id,
    bandId: bands.get(5)!.id,
    hireDate,
  })
  await upsertEmployee({
    employeeNumber: "EMP-0005",
    firstName: "Patrick",
    lastName: "Habimana",
    email: "p.habimana@ncbarwanda.com",
    positionId: officerChannelsAnalyst.id,
    bandId: bands.get(3)!.id,
    hireDate,
  })

  void md_employee
  void itHoD_employee

  // eslint-disable-next-line no-console
  console.log("Seed complete: org structure + 5 demo employees.")
  // eslint-disable-next-line no-console
  console.log(
    "Try: GET /api/organization/org-chart, GET /api/employees/{Patrick's id}/reporting-manager"
  )
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
