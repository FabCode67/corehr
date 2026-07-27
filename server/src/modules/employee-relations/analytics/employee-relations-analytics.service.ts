import { Injectable } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { EmployeeRelationsAccessService } from "../access/employee-relations-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

const MS_PER_DAY = 1000 * 60 * 60 * 24
const OPEN_STATUSES = ["DRAFT", "UNDER_INVESTIGATION", "PENDING_DECISION", "SANCTION_ISSUED", "APPEALED"] as const
const DECIDED_STATUSES = ["SANCTION_ISSUED", "CLOSED", "APPEALED"] as const

/** Shape shared by every "bucket by org attribute" query below — fetched
 *  once per method via the employee's CURRENT position/branch (see schema
 *  module doc comment on why this isn't a point-in-time snapshot). */
const EMPLOYEE_ORG_SELECT = {
  position: {
    select: {
      department: { select: { id: true, name: true, function: { select: { id: true, name: true } } } },
      level: { select: { id: true, name: true } },
    },
  },
  band: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
} as const

function bucketCount<K extends string>(rows: { key: K; name: string }[]): { key: string; name: string; count: number }[] {
  const buckets = new Map<string, { name: string; count: number }>()
  for (const row of rows) {
    const bucket = buckets.get(row.key) ?? { name: row.name, count: 0 }
    bucket.count += 1
    buckets.set(row.key, bucket)
  }
  return Array.from(buckets.entries()).map(([key, bucket]) => ({ key, ...bucket }))
}

@Injectable()
export class EmployeeRelationsAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: EmployeeRelationsAccessService
  ) {}

  private async caseWhere(actingEmployeeId: string): Promise<Prisma.DisciplinaryCaseWhereInput> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.accessService.buildCaseWhere(scope)
  }

  private async sanctionWhere(actingEmployeeId: string): Promise<Prisma.SanctionWhereInput> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.accessService.buildSanctionWhere(scope)
  }

  /** Disciplinary Overview — the dashboard's headline counters. */
  async getOverview(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const [totalCases, openCases, closedCases, underInvestigation, appealsPending] = await Promise.all([
      this.prisma.disciplinaryCase.count({ where }),
      this.prisma.disciplinaryCase.count({ where: { ...where, status: { in: [...OPEN_STATUSES] } } }),
      this.prisma.disciplinaryCase.count({ where: { ...where, status: "CLOSED" } }),
      this.prisma.disciplinaryCase.count({ where: { ...where, status: "UNDER_INVESTIGATION" } }),
      this.prisma.appeal.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, disciplinaryCase: where } }),
    ])
    return { totalCases, openCases, closedCases, underInvestigation, appealsPending }
  }

  async getCasesByStatus(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const grouped = await this.prisma.disciplinaryCase.groupBy({ by: ["status"], where, _count: { _all: true } })
    return grouped.map((row) => ({ status: row.status, count: row._count._all }))
  }

  async getCasesByCategory(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const grouped = await this.prisma.disciplinaryCase.groupBy({ by: ["category"], where, _count: { _all: true } })
    return grouped.map((row) => ({ category: row.category, count: row._count._all }))
  }

  /** Department/Branch Analysis — computed from the employee's current
   *  position/branch, same simplification as Forms Management's
   *  department-comparison analytics (see schema module doc comment). */
  async getCasesByDepartment(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const cases = await this.prisma.disciplinaryCase.findMany({ where, select: { employee: { select: EMPLOYEE_ORG_SELECT } } })
    const rows = cases.map((item) => ({
      key: item.employee.position?.department.id ?? "unassigned",
      name: item.employee.position?.department.name ?? "Unassigned",
    }))
    return bucketCount(rows)
  }

  async getCasesByBranch(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const cases = await this.prisma.disciplinaryCase.findMany({ where, select: { employee: { select: EMPLOYEE_ORG_SELECT } } })
    const rows = cases.map((item) => ({ key: item.employee.branch?.id ?? "unassigned", name: item.employee.branch?.name ?? "Unassigned" }))
    return bucketCount(rows)
  }

  /** Monthly case trend for the last 12 months. */
  async getMonthlyCaseTrend(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const since = new Date()
    since.setMonth(since.getMonth() - 11)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const cases = await this.prisma.disciplinaryCase.findMany({ where: { ...where, dateReported: { gte: since } }, select: { dateReported: true } })

    const months: { month: string; count: number }[] = []
    for (let i = 0; i < 12; i++) {
      const cursor = new Date(since)
      cursor.setMonth(since.getMonth() + i)
      months.push({ month: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`, count: 0 })
    }
    for (const item of cases) {
      const key = `${item.dateReported.getFullYear()}-${String(item.dateReported.getMonth() + 1).padStart(2, "0")}`
      const bucket = months.find((month) => month.month === key)
      if (bucket) bucket.count += 1
    }
    return months
  }

  /** Annual case trend — every year with at least one case. */
  async getAnnualCaseTrend(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const cases = await this.prisma.disciplinaryCase.findMany({ where, select: { dateReported: true } })
    const rows = cases.map((item) => ({ key: String(item.dateReported.getFullYear()), name: String(item.dateReported.getFullYear()) }))
    return bucketCount(rows).sort((a, b) => a.key.localeCompare(b.key))
  }

  // ---- Sanction Analysis --------------------------------------------------

  async getSanctionsByType(actingEmployeeId: string) {
    const where = await this.sanctionWhere(actingEmployeeId)
    const grouped = await this.prisma.sanction.groupBy({ by: ["sanctionTypeId"], where, _count: { _all: true } })
    const types = await this.prisma.sanctionType.findMany({ where: { id: { in: grouped.map((row) => row.sanctionTypeId) } } })
    const nameById = new Map(types.map((type) => [type.id, type.name]))
    return grouped.map((row) => ({ sanctionTypeId: row.sanctionTypeId, name: nameById.get(row.sanctionTypeId) ?? "Unknown", count: row._count._all }))
  }

  async getSanctionsByYear(actingEmployeeId: string) {
    const where = await this.sanctionWhere(actingEmployeeId)
    const sanctions = await this.prisma.sanction.findMany({ where, select: { dateOfSanction: true } })
    const rows = sanctions.map((item) => ({ key: String(item.dateOfSanction.getFullYear()), name: String(item.dateOfSanction.getFullYear()) }))
    return bucketCount(rows).sort((a, b) => a.key.localeCompare(b.key))
  }

  /** Sanction trend by type per year — lets the client derive "warning
   *  trends" / "termination trends" by filtering on the seeded default
   *  type names, without hardcoding those names into this service (sanction
   *  types are HR-configurable — see schema module doc comment). */
  async getSanctionTrendByType(actingEmployeeId: string) {
    const where = await this.sanctionWhere(actingEmployeeId)
    const sanctions = await this.prisma.sanction.findMany({ where, select: { dateOfSanction: true, sanctionType: { select: { id: true, name: true } } } })
    const buckets = new Map<string, { year: string; sanctionTypeId: string; sanctionTypeName: string; count: number }>()
    for (const item of sanctions) {
      const year = String(item.dateOfSanction.getFullYear())
      const key = `${year}:${item.sanctionType.id}`
      const bucket = buckets.get(key) ?? { year, sanctionTypeId: item.sanctionType.id, sanctionTypeName: item.sanctionType.name, count: 0 }
      bucket.count += 1
      buckets.set(key, bucket)
    }
    return Array.from(buckets.values()).sort((a, b) => a.year.localeCompare(b.year))
  }

  async getSanctionsByDepartment(actingEmployeeId: string) {
    return this.bucketSanctionsByOrgAttribute(actingEmployeeId, (item) => ({
      key: item.employee.position?.department.id ?? "unassigned",
      name: item.employee.position?.department.name ?? "Unassigned",
    }))
  }

  async getSanctionsByBranch(actingEmployeeId: string) {
    return this.bucketSanctionsByOrgAttribute(actingEmployeeId, (item) => ({
      key: item.employee.branch?.id ?? "unassigned",
      name: item.employee.branch?.name ?? "Unassigned",
    }))
  }

  async getSanctionsByFunction(actingEmployeeId: string) {
    return this.bucketSanctionsByOrgAttribute(actingEmployeeId, (item) => ({
      key: item.employee.position?.department.function.id ?? "unassigned",
      name: item.employee.position?.department.function.name ?? "Unassigned",
    }))
  }

  async getSanctionsByLevel(actingEmployeeId: string) {
    return this.bucketSanctionsByOrgAttribute(actingEmployeeId, (item) => ({
      key: item.employee.position?.level?.id ?? "unassigned",
      name: item.employee.position?.level?.name ?? "Unassigned",
    }))
  }

  async getSanctionsByBand(actingEmployeeId: string) {
    return this.bucketSanctionsByOrgAttribute(actingEmployeeId, (item) => ({
      key: item.employee.band?.id ?? "unassigned",
      name: item.employee.band?.name ?? "Unassigned",
    }))
  }

  private async bucketSanctionsByOrgAttribute(
    actingEmployeeId: string,
    pick: (item: { employee: Prisma.EmployeeGetPayload<{ select: typeof EMPLOYEE_ORG_SELECT }> }) => { key: string; name: string }
  ) {
    const where = await this.sanctionWhere(actingEmployeeId)
    const sanctions = await this.prisma.sanction.findMany({ where, select: { employee: { select: EMPLOYEE_ORG_SELECT } } })
    return bucketCount(sanctions.map(pick))
  }

  // ---- Investigations & Appeals -------------------------------------------

  /** Average investigation completion time (days), and how many open
   *  investigations are past their dueDate — the "overdue" dashboard
   *  metric (see schema module doc comment: computed, not a scheduled job). */
  async getInvestigationStats(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const investigations = await this.prisma.investigation.findMany({
      where: { disciplinaryCase: where },
      select: { status: true, startDate: true, endDate: true, dueDate: true },
    })

    const completed = investigations.filter((item) => item.status === "COMPLETED" && item.endDate)
    const durations = completed.map((item) => (item.endDate!.getTime() - item.startDate.getTime()) / MS_PER_DAY)
    const averageCompletionDays = durations.length > 0 ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10 : null

    const now = new Date()
    const overdueCount = investigations.filter((item) => item.status === "IN_PROGRESS" && item.dueDate && item.dueDate < now).length

    return { totalInvestigations: investigations.length, completedCount: completed.length, averageCompletionDays, overdueCount }
  }

  /** Appeal rate = appeals filed / cases that reached a decision. */
  async getAppealStats(actingEmployeeId: string) {
    const where = await this.caseWhere(actingEmployeeId)
    const [decidedCaseCount, appeals] = await Promise.all([
      this.prisma.disciplinaryCase.count({ where: { ...where, status: { in: [...DECIDED_STATUSES] } } }),
      this.prisma.appeal.findMany({ where: { disciplinaryCase: where }, select: { status: true, outcome: true } }),
    ])
    const pending = appeals.filter((appeal) => appeal.status !== "DECIDED").length
    const appealRate = decidedCaseCount > 0 ? Math.round((appeals.length / decidedCaseCount) * 1000) / 10 : null
    return { totalAppeals: appeals.length, pending, appealRate }
  }
}
