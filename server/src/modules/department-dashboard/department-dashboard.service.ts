import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import { FormInstanceStatus } from "@prisma/client"

import { resolveDepartmentFilterIds } from "../../common/department-hierarchy.util"
import { PrismaService } from "../../prisma/prisma.service"

/**
 * Personal, department-scoped counterpart to the bank-wide HR Analytics
 * module (see that module's doc comment — it explicitly calls out this gap
 * as a future follow-up). A Head of Department ("Department.headOfDepartmentId"
 * — the same authoritative field the Bulk Import framework and the
 * Departments admin page use, NOT the org-chart-derived "no reportsTo in
 * this department" heuristic Performance/Learning/Recruitment/Forms
 * approval-routing uses) gets a single summary of their own department:
 * headcount, performance, leave, and forms — the same four areas the
 * request named. HR Administrators can also pull any department's summary
 * (useful for spot-checking what a head of department sees), everyone else
 * is refused.
 *
 * Scoped to one department plus its direct sub-departments, reusing
 * resolveDepartmentFilterIds() — the exact same cascading rule the
 * Employees table's department filter already uses, so "my department"
 * here means the same set of people an HR admin filtering the Employees
 * table by this department would see.
 */
@Injectable()
export class DepartmentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every active department this employee is the designated head of —
   *  almost always zero or one, but Department.headOfDepartment is a
   *  one-to-many relation (nothing stops HR assigning the same person head
   *  of two departments), so this returns a list rather than assuming one. */
  async getMyDepartments(employeeId: string) {
    return this.prisma.department.findMany({
      where: { headOfDepartmentId: employeeId, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    })
  }

  private async assertAccess(departmentId: string, actingEmployeeId: string) {
    const [department, actor] = await Promise.all([
      this.prisma.department.findUnique({
        where: { id: departmentId },
        include: {
          function: { select: { name: true } },
          headOfDepartment: { select: { employeeNumber: true, firstName: true, middleName: true, lastName: true } },
        },
      }),
      this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId }, select: { isAdmin: true } }),
    ])

    if (!department) {
      throw new NotFoundException(`Department ${departmentId} not found`)
    }
    if (!actor?.isAdmin && department.headOfDepartmentId !== actingEmployeeId) {
      throw new ForbiddenException("Only this department's Head of Department or an HR Administrator can view this dashboard.")
    }

    return department
  }

  async getSummary(departmentId: string, actingEmployeeId: string) {
    const department = await this.assertAccess(departmentId, actingEmployeeId)
    const departmentIds = await resolveDepartmentFilterIds(this.prisma, departmentId)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    const employeeWhere = { isActive: true, position: { departmentId: { in: departmentIds } } } as const

    const [headcount, performance, leave, forms] = await Promise.all([
      this.headcountSummary(employeeWhere),
      this.performanceSummary(departmentIds),
      this.leaveSummary(employeeWhere, now, yearStart),
      this.formsSummary(employeeWhere, now, monthStart),
    ])

    return {
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        functionName: department.function.name,
        headOfDepartment: department.headOfDepartment,
      },
      headcount,
      performance,
      leave,
      forms,
    }
  }

  private async headcountSummary(employeeWhere: { isActive: true; position: { departmentId: { in: string[] } } }) {
    const [total, byGenderRaw, byContractTypeRaw, vacantPositions] = await Promise.all([
      this.prisma.employee.count({ where: employeeWhere }),
      this.prisma.employee.groupBy({ by: ["gender"], where: employeeWhere, _count: { _all: true } }),
      this.prisma.employee.groupBy({ by: ["contractType"], where: employeeWhere, _count: { _all: true } }),
      this.prisma.position.count({
        where: { departmentId: { in: employeeWhere.position.departmentId.in }, isActive: true, employees: { none: { isActive: true } } },
      }),
    ])

    return {
      total,
      byGender: byGenderRaw.map((row) => ({ gender: row.gender, count: row._count._all })),
      byContractType: byContractTypeRaw
        .filter((row) => row.contractType !== null)
        .map((row) => ({ contractType: row.contractType as string, count: row._count._all })),
      vacantPositions,
    }
  }

  private async performanceSummary(departmentIds: string[]) {
    const where = { departmentId: { in: departmentIds } }
    const [byStatusRaw, ratingAgg, ratingDistributionRaw] = await Promise.all([
      this.prisma.performanceReview.groupBy({ by: ["status"], where, _count: { _all: true } }),
      this.prisma.performanceReview.aggregate({ where: { ...where, overallRating: { not: null } }, _avg: { overallRating: true } }),
      this.prisma.performanceReview.groupBy({ by: ["overallRating"], where: { ...where, overallRating: { not: null } }, _count: { _all: true } }),
    ])

    const byStatus = byStatusRaw.map((row) => ({ status: row.status, count: row._count._all }))
    const total = byStatus.reduce((sum, row) => sum + row.count, 0)
    const finalized = byStatus.find((row) => row.status === "FINALIZED")?.count ?? 0

    return {
      total,
      completionRate: total === 0 ? 0 : Math.round((finalized / total) * 1000) / 10,
      averageRating: ratingAgg._avg.overallRating === null ? null : Math.round(ratingAgg._avg.overallRating * 10) / 10,
      byStatus,
      ratingDistribution: ratingDistributionRaw
        .filter((row) => row.overallRating !== null)
        .map((row) => ({ rating: row.overallRating as number, count: row._count._all }))
        .sort((a, b) => a.rating - b.rating),
    }
  }

  private async leaveSummary(
    employeeWhere: { isActive: true; position: { departmentId: { in: string[] } } },
    now: Date,
    yearStart: Date
  ) {
    const employeeFilter = { employee: employeeWhere }

    const [pending, approvedThisYear, currentlyOnLeave, byTypeRaw] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { ...employeeFilter, status: { in: ["SUBMITTED", "PENDING_APPROVAL"] } } }),
      this.prisma.leaveRequest.findMany({
        where: { ...employeeFilter, status: { in: ["APPROVED", "COMPLETED"] }, startDate: { gte: yearStart } },
        select: { numberOfDays: true },
      }),
      this.prisma.leaveRequest.count({
        where: { ...employeeFilter, status: { in: ["APPROVED", "COMPLETED"] }, startDate: { lte: now }, endDate: { gte: now } },
      }),
      this.prisma.leaveRequest.groupBy({
        by: ["leaveTypeId"],
        where: { ...employeeFilter, status: { in: ["APPROVED", "COMPLETED"] }, startDate: { gte: yearStart } },
        _count: { _all: true },
      }),
    ])

    const leaveTypes = byTypeRaw.length
      ? await this.prisma.leaveType.findMany({ where: { id: { in: byTypeRaw.map((row) => row.leaveTypeId) } }, select: { id: true, name: true } })
      : []
    const leaveTypeNameById = new Map(leaveTypes.map((type) => [type.id, type.name]))

    return {
      pendingApprovalCount: pending,
      totalDaysTakenThisYear: approvedThisYear.reduce((sum, row) => sum + row.numberOfDays, 0),
      currentlyOnLeaveCount: currentlyOnLeave,
      byType: byTypeRaw
        .map((row) => ({ leaveTypeName: leaveTypeNameById.get(row.leaveTypeId) ?? "Unknown", count: row._count._all }))
        .sort((a, b) => b.count - a.count),
    }
  }

  private async formsSummary(
    employeeWhere: { isActive: true; position: { departmentId: { in: string[] } } },
    now: Date,
    monthStart: Date
  ) {
    const employeeFilter = { employee: employeeWhere }
    const OPEN_STATUSES: FormInstanceStatus[] = [
      FormInstanceStatus.ASSIGNED,
      FormInstanceStatus.IN_PROGRESS,
      FormInstanceStatus.SUBMITTED,
      FormInstanceStatus.PENDING_SIGNATURES,
    ]

    const [pending, overdue, completedThisMonth, byStatusRaw] = await Promise.all([
      this.prisma.formInstance.count({ where: { ...employeeFilter, status: { in: OPEN_STATUSES } } }),
      this.prisma.formInstance.count({ where: { ...employeeFilter, status: { in: OPEN_STATUSES }, dueDate: { lt: now } } }),
      this.prisma.formInstance.count({ where: { ...employeeFilter, status: "COMPLETED", completedAt: { gte: monthStart } } }),
      this.prisma.formInstance.groupBy({ by: ["status"], where: employeeFilter, _count: { _all: true } }),
    ])

    return {
      pendingCount: pending,
      overdueCount: overdue,
      completedThisMonth,
      byStatus: byStatusRaw.map((row) => ({ status: row.status, count: row._count._all })),
    }
  }
}
