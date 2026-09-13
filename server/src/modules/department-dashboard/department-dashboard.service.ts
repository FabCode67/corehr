import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import { CourseAssignmentStatus, FormInstanceStatus } from "@prisma/client"

import { resolveDepartmentFilterIds } from "../../common/department-hierarchy.util"
import { PrismaService } from "../../prisma/prisma.service"
import { EmployeesExportService } from "../employees/employees-export.service"
import { EmployeesService } from "../employees/employees.service"
import { OrgChartService } from "../organization/org-chart/org-chart.service"
import { CreateRequisitionDto } from "../recruitment/requisitions/dto/create-requisition.dto"
import { RequisitionsService } from "../recruitment/requisitions/requisitions.service"

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeesService: EmployeesService,
    private readonly employeesExportService: EmployeesExportService,
    private readonly orgChartService: OrgChartService,
    private readonly requisitionsService: RequisitionsService
  ) {}

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

  /** Public — reused by every Head of Department capability below (not just
   *  getSummary), so each one enforces the exact same "this department's
   *  designated head, or an HR Administrator" rule rather than each
   *  re-deriving it slightly differently. */
  async assertAccess(departmentId: string, actingEmployeeId: string) {
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

  // ---------------------------------------------------------------------
  // Head of Department portal — "control everything in his department"
  // follow-up request: view/export/recruit capabilities layered onto the
  // dashboard above. Deliberately NO write access to employee or position
  // records (HR keeps sole ownership of those) — the one permitted write
  // action is job requisition creation, and even that is routed through
  // the existing recruitment approval workflow unmodified. Every method
  // below starts with the same assertAccess() gate as getSummary().
  // ---------------------------------------------------------------------

  /** Filterable/searchable employee list, scoped to the department (+
   *  sub-departments) — same pagination/search shape as the admin
   *  Employees table, just pre-scoped and access-gated. */
  async getEmployees(
    departmentId: string,
    actingEmployeeId: string,
    params: { search?: string; positionId?: string; includeInactive?: boolean; page?: number; pageSize?: number } = {}
  ) {
    await this.assertAccess(departmentId, actingEmployeeId)
    const { search, positionId, includeInactive, page, pageSize } = params
    return this.employeesService.findAllPaginated({ departmentId, positionId, includeInactive, search }, page, pageSize)
  }

  /** Single employee's full profile — read-only, and only within the
   *  acting head's own department scope (never trust the employeeId alone;
   *  a department head could otherwise type in any employee's id). */
  async getEmployee(departmentId: string, employeeId: string, actingEmployeeId: string) {
    await this.assertAccess(departmentId, actingEmployeeId)
    const employee = await this.employeesService.findOne(employeeId)
    const departmentIds = await resolveDepartmentFilterIds(this.prisma, departmentId)
    if (!employee.position || !departmentIds.includes(employee.position.departmentId)) {
      throw new ForbiddenException("This employee is not part of your department.")
    }
    return employee
  }

  /** Builds the export buffer — mirrors EmployeesController.exportEmployees
   *  exactly, just forced to this department's scope server-side (the
   *  column list is still caller-chosen, same column-picker UX as the
   *  admin Employees export). */
  async exportEmployees(
    departmentId: string,
    actingEmployeeId: string,
    params: { columns?: string[]; format?: string } = {}
  ) {
    await this.assertAccess(departmentId, actingEmployeeId)
    const resolvedColumns = this.employeesExportService.resolveColumns(params.columns ?? [])

    const [employees, lineManagers] = await Promise.all([
      this.employeesService.findAllForExport({ departmentId }),
      this.employeesService.getLineManagersBatch(),
    ])

    const isCsv = params.format === "csv"
    const buffer = isCsv
      ? this.employeesExportService.generateCsv(employees, lineManagers, resolvedColumns)
      : this.employeesExportService.generateXlsx(employees, lineManagers, resolvedColumns)

    return { buffer, isCsv }
  }

  /** Positions + fill/vacancy status for the department — read-only (no
   *  PositionsService reuse needed; this just needs the employee count per
   *  position, which PositionsService.findAll() doesn't compute). */
  async getPositions(departmentId: string, actingEmployeeId: string) {
    await this.assertAccess(departmentId, actingEmployeeId)
    const departmentIds = await resolveDepartmentFilterIds(this.prisma, departmentId)

    const positions = await this.prisma.position.findMany({
      where: { departmentId: { in: departmentIds }, isActive: true },
      include: {
        department: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        level: { select: { id: true, name: true, code: true, rank: true } },
        employees: {
          where: { isActive: true },
          select: { employeeNumber: true, firstName: true, middleName: true, lastName: true },
        },
      },
      orderBy: { title: "asc" },
    })

    return positions.map((position) => ({
      id: position.id,
      title: position.title,
      department: position.department,
      unit: position.unit,
      level: position.level,
      employees: position.employees,
      isVacant: position.employees.length === 0,
    }))
  }

  /** Per-employee training/learning completion hours for the department —
   *  read-only. "Completed" = VERIFIED or CLOSED (HR has confirmed the
   *  certificate), matching CourseAssignmentStatus's doc comment on what
   *  counts as genuinely done vs. still self-reported/in flight. */
  async getLearningHours(departmentId: string, actingEmployeeId: string) {
    await this.assertAccess(departmentId, actingEmployeeId)
    const departmentIds = await resolveDepartmentFilterIds(this.prisma, departmentId)

    const employees = await this.prisma.employee.findMany({
      where: { isActive: true, position: { departmentId: { in: departmentIds } } },
      select: { employeeNumber: true, firstName: true, middleName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })
    if (employees.length === 0) return []

    const employeeNumbers = employees.map((employee) => employee.employeeNumber)
    const COMPLETED_STATUSES: CourseAssignmentStatus[] = [CourseAssignmentStatus.VERIFIED, CourseAssignmentStatus.CLOSED]
    const IN_PROGRESS_STATUSES: CourseAssignmentStatus[] = [
      CourseAssignmentStatus.IN_PROGRESS,
      CourseAssignmentStatus.COMPLETED_BY_EMPLOYEE,
      CourseAssignmentStatus.PENDING_VERIFICATION,
    ]

    const assignments = await this.prisma.courseAssignment.findMany({
      where: { employeeId: { in: employeeNumbers } },
      select: { employeeId: true, status: true, course: { select: { durationHours: true } } },
    })

    type LearningSummary = { completedHours: number; completedCount: number; inProgressCount: number; assignedCount: number }
    const summaryByEmployee = new Map<string, LearningSummary>()
    for (const employeeNumber of employeeNumbers) {
      summaryByEmployee.set(employeeNumber, { completedHours: 0, completedCount: 0, inProgressCount: 0, assignedCount: 0 })
    }

    for (const assignment of assignments) {
      const summary = summaryByEmployee.get(assignment.employeeId)
      if (!summary) continue
      if (COMPLETED_STATUSES.includes(assignment.status)) {
        summary.completedCount += 1
        summary.completedHours += assignment.course.durationHours ?? 0
      } else if (IN_PROGRESS_STATUSES.includes(assignment.status)) {
        summary.inProgressCount += 1
      } else {
        summary.assignedCount += 1
      }
    }

    return employees.map((employee) => ({
      ...employee,
      ...summaryByEmployee.get(employee.employeeNumber)!,
    }))
  }

  /** Org chart subtree for the department — read-only. See
   *  OrgChartService.getDepartmentTree's doc comment for how out-of-scope
   *  ancestors are pruned without dropping in-scope descendants. */
  async getOrgChart(departmentId: string, actingEmployeeId: string) {
    await this.assertAccess(departmentId, actingEmployeeId)
    const departmentIds = await resolveDepartmentFilterIds(this.prisma, departmentId)
    return this.orgChartService.getDepartmentTree(departmentIds)
  }

  /** Workforce plans a department head can build a requisition against —
   *  deliberately only APPROVED ones (RequisitionsService.create() enforces
   *  this anyway; surfacing only eligible plans here avoids a confusing
   *  "approved plan required" error after the head has already filled in a
   *  whole requisition form). Queried directly (not via
   *  WorkforcePlansService.findAll()) because that service's access scope
   *  is RecruitmentAccessService's org-chart-derived "auto head" — a
   *  different, narrower definition than Department.headOfDepartmentId
   *  (see this module's doc comment) that would wrongly hide plans from a
   *  head who isn't also the auto-derived hiring manager. */
  async getEligibleWorkforcePlans(departmentId: string, actingEmployeeId: string) {
    await this.assertAccess(departmentId, actingEmployeeId)
    const departmentIds = await resolveDepartmentFilterIds(this.prisma, departmentId)
    return this.prisma.workforcePlan.findMany({
      where: { departmentId: { in: departmentIds }, status: "APPROVED" },
      select: {
        id: true,
        title: true,
        departmentId: true,
        numberOfPositions: true,
        employmentType: true,
        expectedHiringDate: true,
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  /** The one write action a department head gets: creating a job
   *  requisition for their own department, through the existing
   *  RequisitionsService/approval workflow unmodified. Everything here is
   *  defense-in-depth scope-checking — requestedById/hiringManagerId are
   *  always forced to the acting head regardless of what's in the request
   *  body, and both the workforce plan and the target position (existing or
   *  brand-new) must already belong to the department's scope. */
  async createRequisition(departmentId: string, actingEmployeeId: string, dto: CreateRequisitionDto) {
    await this.assertAccess(departmentId, actingEmployeeId)
    const departmentIds = await resolveDepartmentFilterIds(this.prisma, departmentId)

    const plan = await this.prisma.workforcePlan.findUnique({ where: { id: dto.workforcePlanId } })
    if (!plan || !departmentIds.includes(plan.departmentId)) {
      throw new ForbiddenException("That workforce plan isn't scoped to your department.")
    }

    if (dto.positionId) {
      const position = await this.prisma.position.findUnique({ where: { id: dto.positionId } })
      if (!position || !departmentIds.includes(position.departmentId)) {
        throw new ForbiddenException("That position isn't in your department.")
      }
    } else if (dto.newPosition) {
      if (!departmentIds.includes(dto.newPosition.departmentId)) {
        throw new ForbiddenException("The new position must belong to your department.")
      }
    }

    const scopedDto: CreateRequisitionDto = { ...dto, requestedById: actingEmployeeId, hiringManagerId: actingEmployeeId }
    return this.requisitionsService.create(scopedDto, actingEmployeeId)
  }
}
