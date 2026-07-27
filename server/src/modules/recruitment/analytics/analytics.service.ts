import { Injectable } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { RecruitmentAccessService } from "../access/recruitment-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

const MS_PER_DAY = 1000 * 60 * 60 * 24

@Injectable()
export class RecruitmentAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService
  ) {}

  private async requisitionWhere(actingEmployeeId: string): Promise<Prisma.JobRequisitionWhereInput> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.accessService.buildRequisitionWhere(scope)
  }

  private async applicationWhere(actingEmployeeId: string): Promise<Prisma.ApplicationWhereInput> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.accessService.buildApplicationWhere(scope)
  }

  /** Headline counters for the Recruitment dashboard landing page. */
  async getOverview(actingEmployeeId: string) {
    const requisitionWhere = await this.requisitionWhere(actingEmployeeId)
    const applicationWhere = await this.applicationWhere(actingEmployeeId)

    const [openRequisitions, activeApplications, interviewsThisWeek, pendingOffers, hiresThisMonth] = await Promise.all([
      this.prisma.jobRequisition.count({ where: { ...requisitionWhere, status: "APPROVED" } }),
      this.prisma.application.count({
        where: { ...applicationWhere, status: { notIn: ["HIRED", "REJECTED", "WITHDRAWN"] } },
      }),
      this.prisma.interview.count({
        where: {
          application: applicationWhere,
          status: "SCHEDULED",
          interviewDate: { gte: startOfWeek(), lt: endOfWeek() },
        },
      }),
      this.prisma.offer.count({ where: { application: applicationWhere, status: "SENT" } }),
      this.prisma.application.count({
        where: { ...applicationWhere, status: "HIRED", updatedAt: { gte: startOfMonth() } },
      }),
    ])

    return { openRequisitions, activeApplications, interviewsThisWeek, pendingOffers, hiresThisMonth }
  }

  /** Application counts per pipeline stage — the Kanban funnel view. */
  async getFunnel(actingEmployeeId: string) {
    const applicationWhere = await this.applicationWhere(actingEmployeeId)
    const grouped = await this.prisma.application.groupBy({
      by: ["status"],
      where: applicationWhere,
      _count: { _all: true },
    })
    return grouped.map((row) => ({ status: row.status, count: row._count._all }))
  }

  /** Same breakdown as getFunnel, kept as a separate endpoint since the
   *  spec calls out "status distribution" as its own report. */
  async getStatusDistribution(actingEmployeeId: string) {
    return this.getFunnel(actingEmployeeId)
  }

  /** Offer acceptance rate = ACCEPTED / (ACCEPTED + DECLINED + EXPIRED) —
   *  offers still DRAFT/SENT haven't been responded to yet and are excluded
   *  from the denominator. */
  async getOfferStats(actingEmployeeId: string) {
    const applicationWhere = await this.applicationWhere(actingEmployeeId)
    const grouped = await this.prisma.offer.groupBy({
      by: ["status"],
      where: { application: applicationWhere },
      _count: { _all: true },
    })

    const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]))
    const responded = (counts.ACCEPTED ?? 0) + (counts.DECLINED ?? 0) + (counts.EXPIRED ?? 0)
    const acceptanceRate = responded > 0 ? Math.round(((counts.ACCEPTED ?? 0) / responded) * 1000) / 10 : null

    return { byStatus: counts, acceptanceRate }
  }

  /** Average days from requisition approval to the application being
   *  marked HIRED — "time to hire". Computed at read time from existing
   *  timestamps rather than stored, same pattern as stage delay elsewhere. */
  async getTimeToHire(actingEmployeeId: string) {
    const applicationWhere = await this.applicationWhere(actingEmployeeId)
    const hired = await this.prisma.application.findMany({
      where: { ...applicationWhere, status: "HIRED" },
      select: {
        updatedAt: true,
        jobPosting: { select: { requisition: { select: { approvedAt: true, createdAt: true } } } },
      },
    })

    if (hired.length === 0) {
      return { averageDays: null, sampleSize: 0 }
    }

    const days = hired.map((application) => {
      const start = application.jobPosting.requisition.approvedAt ?? application.jobPosting.requisition.createdAt
      return (application.updatedAt.getTime() - start.getTime()) / MS_PER_DAY
    })

    const averageDays = Math.round((days.reduce((sum, value) => sum + value, 0) / days.length) * 10) / 10
    return { averageDays, sampleSize: hired.length }
  }

  /** Approved (open) vacancies grouped by department and branch. */
  async getVacanciesByDepartment(actingEmployeeId: string) {
    const requisitionWhere = await this.requisitionWhere(actingEmployeeId)
    const grouped = await this.prisma.jobRequisition.groupBy({
      by: ["departmentId"],
      where: { ...requisitionWhere, status: "APPROVED" },
      _sum: { numberOfVacancies: true },
      _count: { _all: true },
    })

    const departments = await this.prisma.department.findMany({
      where: { id: { in: grouped.map((row) => row.departmentId) } },
      select: { id: true, name: true },
    })
    const nameById = new Map(departments.map((department) => [department.id, department.name]))

    return grouped.map((row) => ({
      departmentId: row.departmentId,
      departmentName: nameById.get(row.departmentId) ?? "Unknown",
      openRequisitions: row._count._all,
      vacancies: row._sum.numberOfVacancies ?? 0,
    }))
  }

  async getVacanciesByBranch(actingEmployeeId: string) {
    const requisitionWhere = await this.requisitionWhere(actingEmployeeId)
    const grouped = await this.prisma.jobRequisition.groupBy({
      by: ["branchId"],
      where: { ...requisitionWhere, status: "APPROVED" },
      _sum: { numberOfVacancies: true },
      _count: { _all: true },
    })

    const branches = await this.prisma.branch.findMany({
      where: { id: { in: grouped.map((row) => row.branchId) } },
      select: { id: true, name: true },
    })
    const nameById = new Map(branches.map((branch) => [branch.id, branch.name]))

    return grouped.map((row) => ({
      branchId: row.branchId,
      branchName: nameById.get(row.branchId) ?? "Unknown",
      openRequisitions: row._count._all,
      vacancies: row._sum.numberOfVacancies ?? 0,
    }))
  }

  /** Approved WorkforcePlan budget, summed by department — the closest
   *  proxy this schema has for a recruitment "cost" report (see the on-
   *  screen-only reports scope decision — no per-candidate cost tracking). */
  async getBudgetByDepartment(actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where: Prisma.WorkforcePlanWhereInput = {
      ...this.accessService.buildWorkforcePlanWhere(scope),
      status: "APPROVED",
    }
    const grouped = await this.prisma.workforcePlan.groupBy({
      by: ["departmentId"],
      where,
      _sum: { budget: true },
    })

    const departments = await this.prisma.department.findMany({
      where: { id: { in: grouped.map((row) => row.departmentId) } },
      select: { id: true, name: true },
    })
    const nameById = new Map(departments.map((department) => [department.id, department.name]))

    return grouped.map((row) => ({
      departmentId: row.departmentId,
      departmentName: nameById.get(row.departmentId) ?? "Unknown",
      approvedBudget: row._sum.budget ?? 0,
    }))
  }
}

function startOfWeek(): Date {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(now.getDate() - day)
  return start
}

function endOfWeek(): Date {
  const start = startOfWeek()
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return end
}

function startOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}
