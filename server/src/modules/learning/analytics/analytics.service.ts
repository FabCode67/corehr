import { Injectable } from "@nestjs/common"

import { ContractType, CourseAssignmentStatus, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { LearningAccessService } from "../access/learning-access.service"

export interface LearningAnalyticsFilters {
  categoryId?: string
  institutionId?: string
  departmentId?: string
  branchId?: string
  functionId?: string
  positionId?: string
  levelId?: string
  bandId?: string
  contractType?: string
  isMandatory?: boolean
  employeeId?: string
}

const TERMINAL_STATUSES: CourseAssignmentStatus[] = ["VERIFIED", "CLOSED"]

const ANALYTICS_SELECT = {
  id: true,
  status: true,
  isMandatory: true,
  dueDate: true,
  certificateUrl: true,
  categoryName: true,
  course: {
    select: {
      id: true,
      name: true,
      cost: true,
      durationHours: true,
      categoryId: true,
      institutionId: true,
      institution: { select: { id: true, name: true } },
    },
  },
  employee: { select: { employeeNumber: true, firstName: true, lastName: true } },
  department: { select: { id: true, name: true, functionId: true, function: { select: { id: true, name: true } } } },
  branch: { select: { id: true, name: true } },
  position: { select: { id: true, title: true } },
  band: { select: { id: true, name: true } },
} as const

/**
 * Executive reporting over Learning & Development data. Same approach as
 * Leave/Performance analytics: fetch a filtered slice and aggregate in JS
 * with Maps — simplest to keep correct across this many
 * filter/group-by combinations, and fine at HR-system scale.
 */
@Injectable()
export class LearningAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: LearningAccessService
  ) {}

  private buildWhere(filters: LearningAnalyticsFilters): Prisma.CourseAssignmentWhereInput {
    return {
      ...(filters.categoryId ? { course: { categoryId: filters.categoryId } } : {}),
      ...(filters.institutionId ? { course: { institutionId: filters.institutionId } } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.functionId ? { department: { functionId: filters.functionId } } : {}),
      ...(filters.positionId ? { positionId: filters.positionId } : {}),
      ...(filters.levelId ? { levelId: filters.levelId } : {}),
      ...(filters.bandId ? { bandId: filters.bandId } : {}),
      ...(filters.contractType ? { contractType: filters.contractType as ContractType } : {}),
      ...(filters.isMandatory !== undefined ? { isMandatory: filters.isMandatory } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    }
  }

  private assignments(filters: LearningAnalyticsFilters) {
    return this.prisma.courseAssignment.findMany({ where: this.buildWhere(filters), select: ANALYTICS_SELECT })
  }

  private isCompleted(status: CourseAssignmentStatus) {
    return TERMINAL_STATUSES.includes(status)
  }

  private isOverdue(a: { dueDate: Date | null; status: CourseAssignmentStatus }, now: Date) {
    return Boolean(a.dueDate) && a.dueDate! < now && !this.isCompleted(a.status)
  }

  async overview(filters: LearningAnalyticsFilters = {}) {
    const [totalCourses, activeCourses, mandatoryCourses, optionalCourses, assignments] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.course.count({ where: { isActive: true } }),
      this.prisma.course.count({ where: { category: { isMandatory: true } } }),
      this.prisma.course.count({ where: { category: { isMandatory: false } } }),
      this.assignments(filters),
    ])

    const totalAssignments = assignments.length
    const completedAssignments = assignments.filter((a) => this.isCompleted(a.status)).length
    const completionRate = totalAssignments === 0 ? 0 : Math.round((completedAssignments / totalAssignments) * 10000) / 100

    return { totalCourses, activeCourses, mandatoryCourses, optionalCourses, totalAssignments, completedAssignments, completionRate }
  }

  async progressBreakdown(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    const now = new Date()
    const counts = new Map<string, number>()
    let overdue = 0

    for (const a of assignments) {
      counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
      if (this.isOverdue(a, now)) overdue += 1
    }

    return {
      notStarted: counts.get("ASSIGNED") ?? 0,
      accepted: counts.get("ACCEPTED") ?? 0,
      inProgress: counts.get("IN_PROGRESS") ?? 0,
      completedByEmployee: counts.get("COMPLETED_BY_EMPLOYEE") ?? 0,
      pendingVerification: counts.get("PENDING_VERIFICATION") ?? 0,
      verified: counts.get("VERIFIED") ?? 0,
      rejected: counts.get("REJECTED") ?? 0,
      closed: counts.get("CLOSED") ?? 0,
      overdue,
    }
  }

  private complianceBy(
    assignments: Awaited<ReturnType<LearningAnalyticsService["assignments"]>>,
    keyOf: (a: (typeof assignments)[number]) => { key: string; label: string } | null
  ) {
    const groups = new Map<string, { key: string; label: string; total: number; completed: number }>()
    for (const a of assignments) {
      if (!a.isMandatory) continue
      const grouped = keyOf(a)
      if (!grouped) continue
      const entry = groups.get(grouped.key) ?? { key: grouped.key, label: grouped.label, total: 0, completed: 0 }
      entry.total += 1
      if (this.isCompleted(a.status)) entry.completed += 1
      groups.set(grouped.key, entry)
    }

    return Array.from(groups.values())
      .map((g) => ({
        id: g.key,
        name: g.label,
        totalMandatory: g.total,
        completedMandatory: g.completed,
        compliancePercent: g.total === 0 ? 0 : Math.round((g.completed / g.total) * 10000) / 100,
      }))
      .sort((a, b) => a.compliancePercent - b.compliancePercent)
  }

  async mandatoryComplianceByDepartment(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    return this.complianceBy(assignments, (a) => (a.department ? { key: a.department.id, label: a.department.name } : null))
  }

  async mandatoryComplianceByBranch(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    return this.complianceBy(assignments, (a) => (a.branch ? { key: a.branch.id, label: a.branch.name } : null))
  }

  async mandatoryComplianceByFunction(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    return this.complianceBy(assignments, (a) => (a.department?.function ? { key: a.department.function.id, label: a.department.function.name } : null))
  }

  async mandatoryComplianceByPosition(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    return this.complianceBy(assignments, (a) => (a.position ? { key: a.position.id, label: a.position.title } : null))
  }

  async mandatoryComplianceByBand(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    return this.complianceBy(assignments, (a) => (a.band ? { key: a.band.id, label: a.band.name } : null))
  }

  async departmentAnalysis(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    const groups = new Map<
      string,
      { name: string; total: number; completed: number; hours: number[]; costs: number[]; outstandingMandatory: number }
    >()

    for (const a of assignments) {
      if (!a.department) continue
      const key = a.department.id
      const entry = groups.get(key) ?? { name: a.department.name, total: 0, completed: 0, hours: [], costs: [], outstandingMandatory: 0 }
      entry.total += 1
      if (this.isCompleted(a.status)) entry.completed += 1
      if (a.course.durationHours != null) entry.hours.push(a.course.durationHours)
      if (a.course.cost != null) entry.costs.push(a.course.cost)
      if (a.isMandatory && !this.isCompleted(a.status)) entry.outstandingMandatory += 1
      groups.set(key, entry)
    }

    return Array.from(groups.entries())
      .map(([departmentId, g]) => ({
        departmentId,
        departmentName: g.name,
        completionRate: g.total === 0 ? 0 : Math.round((g.completed / g.total) * 10000) / 100,
        averageTrainingHours: g.hours.length === 0 ? 0 : Math.round((g.hours.reduce((s, v) => s + v, 0) / g.hours.length) * 100) / 100,
        averageTrainingCost: g.costs.length === 0 ? 0 : Math.round((g.costs.reduce((s, v) => s + v, 0) / g.costs.length) * 100) / 100,
        outstandingMandatoryCourses: g.outstandingMandatory,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
  }

  async functionAnalysis(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    const groups = new Map<string, { name: string; total: number; completed: number; hours: number[]; costs: number[] }>()

    for (const a of assignments) {
      if (!a.department?.function) continue
      const key = a.department.function.id
      const entry = groups.get(key) ?? { name: a.department.function.name, total: 0, completed: 0, hours: [], costs: [] }
      entry.total += 1
      if (this.isCompleted(a.status)) entry.completed += 1
      if (a.course.durationHours != null) entry.hours.push(a.course.durationHours)
      if (a.course.cost != null) entry.costs.push(a.course.cost)
      groups.set(key, entry)
    }

    return Array.from(groups.entries())
      .map(([functionId, g]) => ({
        functionId,
        functionName: g.name,
        completionRate: g.total === 0 ? 0 : Math.round((g.completed / g.total) * 10000) / 100,
        averageTrainingHours: g.hours.length === 0 ? 0 : Math.round((g.hours.reduce((s, v) => s + v, 0) / g.hours.length) * 100) / 100,
        averageTrainingCost: g.costs.length === 0 ? 0 : Math.round((g.costs.reduce((s, v) => s + v, 0) / g.costs.length) * 100) / 100,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
  }

  async institutionAnalysis(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    const groups = new Map<string, { name: string; total: number; completed: number; costs: number[] }>()

    for (const a of assignments) {
      const institution = a.course.institution
      const key = institution?.id ?? "unassigned"
      const entry = groups.get(key) ?? { name: institution?.name ?? "Unassigned", total: 0, completed: 0, costs: [] }
      entry.total += 1
      if (this.isCompleted(a.status)) entry.completed += 1
      if (a.course.cost != null) entry.costs.push(a.course.cost)
      groups.set(key, entry)
    }

    return Array.from(groups.entries())
      .map(([institutionId, g]) => ({
        institutionId,
        institutionName: g.name,
        coursesDelivered: g.total,
        totalCost: g.costs.reduce((s, v) => s + v, 0),
        averageCompletionRate: g.total === 0 ? 0 : Math.round((g.completed / g.total) * 10000) / 100,
      }))
      .sort((a, b) => b.coursesDelivered - a.coursesDelivered)
  }

  async costAnalysis(filters: LearningAnalyticsFilters = {}) {
    const assignments = await this.assignments(filters)
    const costed = assignments.filter((a) => a.course.cost != null)
    const totalCost = costed.reduce((sum, a) => sum + (a.course.cost ?? 0), 0)

    const byDepartment = new Map<string, { name: string; cost: number }>()
    const byInstitution = new Map<string, { name: string; cost: number }>()
    const byCategory = new Map<string, { name: string; cost: number }>()
    const employeeIds = new Set<string>()

    for (const a of costed) {
      const cost = a.course.cost ?? 0
      employeeIds.add(a.employee.employeeNumber)

      if (a.department) {
        const entry = byDepartment.get(a.department.id) ?? { name: a.department.name, cost: 0 }
        entry.cost += cost
        byDepartment.set(a.department.id, entry)
      }
      const institutionKey = a.course.institution?.id ?? "unassigned"
      const institutionEntry = byInstitution.get(institutionKey) ?? { name: a.course.institution?.name ?? "Unassigned", cost: 0 }
      institutionEntry.cost += cost
      byInstitution.set(institutionKey, institutionEntry)

      const categoryEntry = byCategory.get(a.categoryName) ?? { name: a.categoryName, cost: 0 }
      categoryEntry.cost += cost
      byCategory.set(a.categoryName, categoryEntry)
    }

    const toArray = (m: Map<string, { name: string; cost: number }>, idKey: string) =>
      Array.from(m.entries())
        .map(([id, v]) => ({ [idKey]: id, name: v.name, cost: v.cost }))
        .sort((a, b) => b.cost - a.cost)

    return {
      totalCost,
      costByDepartment: toArray(byDepartment, "departmentId"),
      costByInstitution: toArray(byInstitution, "institutionId"),
      costByCategory: toArray(byCategory, "categoryName"),
      costPerEmployee: employeeIds.size === 0 ? 0 : Math.round((totalCost / employeeIds.size) * 100) / 100,
    }
  }

  async employeeProfile(employeeId: string) {
    const assignments = await this.assignments({ employeeId })
    const completed = assignments.filter((a) => this.isCompleted(a.status))
    const mandatoryCompleted = completed.filter((a) => a.isMandatory)
    const certificatesEarned = completed.filter((a) => a.certificateUrl).length
    const totalHours = assignments.reduce((sum, a) => sum + (a.course.durationHours ?? 0), 0)
    const totalCost = assignments.reduce((sum, a) => sum + (a.course.cost ?? 0), 0)
    const inProgress = assignments.filter((a) => a.status === "IN_PROGRESS" || a.status === "ACCEPTED")

    return {
      totalAssigned: assignments.length,
      totalCompleted: completed.length,
      mandatoryCompleted: mandatoryCompleted.length,
      certificatesEarned,
      totalTrainingHours: totalHours,
      totalTrainingCost: totalCost,
      currentlyInProgress: inProgress.length,
    }
  }

  /** Overdue mandatory training for the acting employee themselves — powers
   *  the employee-facing AML/mandatory-training warning banner. */
  async myOverdueMandatory(actingEmployeeId: string) {
    const now = new Date()
    const assignments = await this.assignments({ employeeId: actingEmployeeId, isMandatory: true })
    return assignments.filter((a) => this.isOverdue(a, now))
  }

  /** Overdue mandatory training across this manager's direct reports —
   *  powers the manager dashboard's "overdue team members" banner. */
  async teamOverdueMandatory(actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (scope.allowAll) {
      const now = new Date()
      const assignments = await this.assignments({ isMandatory: true })
      return assignments.filter((a) => this.isOverdue(a, now))
    }

    const teamIds = scope.employeeIds.filter((id) => id !== actingEmployeeId)
    if (teamIds.length === 0) return []

    const now = new Date()
    const assignments = await this.prisma.courseAssignment.findMany({
      where: { employeeId: { in: teamIds }, isMandatory: true },
      select: ANALYTICS_SELECT,
    })
    return assignments.filter((a) => this.isOverdue(a, now))
  }
}
