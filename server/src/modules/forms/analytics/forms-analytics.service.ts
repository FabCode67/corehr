import { Injectable } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { FormsAccessService } from "../access/forms-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

const MS_PER_DAY = 1000 * 60 * 60 * 24
const IN_FLIGHT_STATUSES = ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "PENDING_SIGNATURES"] as const

@Injectable()
export class FormsAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: FormsAccessService
  ) {}

  private async instanceWhere(actingEmployeeId: string): Promise<Prisma.FormInstanceWhereInput> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.accessService.buildInstanceWhere(scope)
  }

  /** Headline counters for the Form Tracking Dashboard landing page.
   *  "Overdue" is computed at read time from dueDate, not stored — same
   *  pattern as CourseAssignment's overdue bucket. */
  async getOverview(actingEmployeeId: string) {
    const where = await this.instanceWhere(actingEmployeeId)
    const now = new Date()

    const [assigned, inProgress, pendingSignatures, completed, overdue, rejected] = await Promise.all([
      this.prisma.formInstance.count({ where: { ...where, status: "ASSIGNED" } }),
      this.prisma.formInstance.count({ where: { ...where, status: "IN_PROGRESS" } }),
      this.prisma.formInstance.count({ where: { ...where, status: "PENDING_SIGNATURES" } }),
      this.prisma.formInstance.count({ where: { ...where, status: "COMPLETED" } }),
      this.prisma.formInstance.count({
        where: { ...where, dueDate: { lt: now }, status: { in: [...IN_FLIGHT_STATUSES] } },
      }),
      this.prisma.formInstance.count({ where: { ...where, status: "REJECTED" } }),
    ])

    return { assigned, inProgress, pendingSignatures, completed, overdue, rejected }
  }

  /** Instance counts per lifecycle status — the Form Tracking funnel view. */
  async getStatusDistribution(actingEmployeeId: string) {
    const where = await this.instanceWhere(actingEmployeeId)
    const grouped = await this.prisma.formInstance.groupBy({ by: ["status"], where, _count: { _all: true } })
    return grouped.map((row) => ({ status: row.status, count: row._count._all }))
  }

  /** Completion rate = COMPLETED / (everything except still-DRAFT), and
   *  average days from assignment to completion. */
  async getCompletionStats(actingEmployeeId: string) {
    const where = await this.instanceWhere(actingEmployeeId)

    const [total, completed] = await Promise.all([
      this.prisma.formInstance.count({ where: { ...where, status: { not: "DRAFT" } } }),
      this.prisma.formInstance.findMany({
        where: { ...where, status: "COMPLETED" },
        select: { assignmentDate: true, completedAt: true },
      }),
    ])

    const completionRate = total > 0 ? Math.round((completed.length / total) * 1000) / 10 : null

    const durations = completed
      .filter((instance) => instance.completedAt)
      .map((instance) => (instance.completedAt!.getTime() - instance.assignmentDate.getTime()) / MS_PER_DAY)
    const averageCompletionDays =
      durations.length > 0 ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10 : null

    return { totalInstances: total, completedCount: completed.length, completionRate, averageCompletionDays }
  }

  /** Pending signatures grouped by signer role — helps HR see where the
   *  approval chain is backing up (e.g. too much sitting with Managers). */
  async getPendingSignaturesByRole(actingEmployeeId: string) {
    const where = await this.instanceWhere(actingEmployeeId)
    const pending = await this.prisma.formSignature.findMany({
      where: { status: "PENDING", formInstance: where },
      select: { formSignatureStage: { select: { role: true } } },
    })

    const counts = new Map<string, number>()
    for (const signature of pending) {
      const role = signature.formSignatureStage.role
      counts.set(role, (counts.get(role) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([role, count]) => ({ role, count }))
  }

  /** Instance counts by the assigned employee's department — computed in
   *  JS since FormInstance has no departmentId column of its own (unlike
   *  JobRequisition), so a Prisma groupBy can't reach through employee ->
   *  position -> department directly. */
  async getDepartmentComparison(actingEmployeeId: string) {
    const where = await this.instanceWhere(actingEmployeeId)
    const instances = await this.prisma.formInstance.findMany({
      where,
      select: {
        status: true,
        employee: { select: { position: { select: { department: { select: { id: true, name: true } } } } } },
      },
    })

    const byDepartment = new Map<string, { departmentName: string; total: number; completed: number; overdue: number }>()
    for (const instance of instances) {
      const department = instance.employee.position?.department
      const key = department?.id ?? "unassigned"
      const name = department?.name ?? "Unassigned"
      const bucket = byDepartment.get(key) ?? { departmentName: name, total: 0, completed: 0, overdue: 0 }
      bucket.total += 1
      if (instance.status === "COMPLETED") bucket.completed += 1
      byDepartment.set(key, bucket)
    }

    return Array.from(byDepartment.entries()).map(([departmentId, bucket]) => ({ departmentId, ...bucket }))
  }

  /** Compliance status per form category — % of assigned instances that
   *  reached COMPLETED vs how many are overdue, the closest proxy this
   *  schema has for the spec's "compliance status" report (see reports-
   *  scope decision: on-screen only, no exported file this pass). */
  async getComplianceByCategory(actingEmployeeId: string) {
    const where = await this.instanceWhere(actingEmployeeId)
    const now = new Date()
    const instances = await this.prisma.formInstance.findMany({
      where,
      select: { status: true, dueDate: true, formTemplate: { select: { category: { select: { id: true, name: true } } } } },
    })

    const byCategory = new Map<string, { categoryName: string; total: number; completed: number; overdue: number }>()
    for (const instance of instances) {
      const category = instance.formTemplate.category
      const bucket = byCategory.get(category.id) ?? { categoryName: category.name, total: 0, completed: 0, overdue: 0 }
      bucket.total += 1
      if (instance.status === "COMPLETED") bucket.completed += 1
      if (instance.dueDate && instance.dueDate < now && (IN_FLIGHT_STATUSES as readonly string[]).includes(instance.status)) {
        bucket.overdue += 1
      }
      byCategory.set(category.id, bucket)
    }

    return Array.from(byCategory.entries()).map(([categoryId, bucket]) => ({
      categoryId,
      ...bucket,
      complianceRate: bucket.total > 0 ? Math.round((bucket.completed / bucket.total) * 1000) / 10 : null,
    }))
  }
}
