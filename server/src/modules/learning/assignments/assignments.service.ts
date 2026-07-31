import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { CourseAssignmentPriority, CourseAssignmentStatus, NotificationType, Prisma } from "@prisma/client"

import { buildPaginatedResult, normalizePagination, type PaginatedResult } from "../../../common/pagination"
import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { NotificationsService } from "../../leave/notifications/notifications.service"
import { LearningAccessService } from "../access/learning-access.service"
import { CoursesService } from "../courses/courses.service"

import { ActingEmployeeDto } from "./dto/acting-employee.dto"
import { CreateAssignmentDto } from "./dto/create-assignment.dto"
import { RejectCertificateDto } from "./dto/reject-certificate.dto"
import { SubmitCertificateDto } from "./dto/submit-certificate.dto"
import { UpdateAssignmentDto } from "./dto/update-assignment.dto"
import { VerifyCertificateDto } from "./dto/verify-certificate.dto"

export const ASSIGNMENT_INCLUDE = {
  course: { include: { category: true, institution: true } },
  employee: { select: { employeeNumber: true, firstName: true, lastName: true, profilePictureUrl: true } },
  assignedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  verifiedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  department: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  position: { select: { id: true, title: true } },
  level: { select: { id: true, name: true } },
  band: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  auditLogs: false,
} as const

export interface AssignmentFilters {
  employeeId?: string
  courseId?: string
  categoryId?: string
  status?: string
  isMandatory?: boolean
  departmentId?: string
  branchId?: string
  priority?: string
  overdueOnly?: boolean
}

const TERMINAL_STATUSES: CourseAssignmentStatus[] = ["VERIFIED", "CLOSED"]

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: LearningAccessService,
    private readonly coursesService: CoursesService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  private async safeSendCourseEmail(templateKey: string, employeeId: string, courseName: string, dueDate: Date | null, relatedEntityId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId }, select: { email: true, firstName: true, lastName: true } })
    if (!employee) return
    try {
      await this.emailService.enqueue({
        templateKey,
        recipientEmail: employee.email,
        recipientEmployeeId: employeeId,
        relatedModule: "learning",
        relatedEntityId,
        variables: {
          employee_name: `${employee.firstName} ${employee.lastName}`,
          course_name: courseName,
          due_date: dueDate ? dueDate.toISOString().slice(0, 10) : "No due date set",
          course_url: buildClientUrl("/staff/learning"),
        },
      })
    } catch {
      // best-effort — EmailService.enqueue() already logs internally
    }
  }

  private buildWhere(filters: AssignmentFilters, scope: Awaited<ReturnType<LearningAccessService["resolveScope"]>>): Prisma.CourseAssignmentWhereInput {
    const accessWhere = this.accessService.buildAssignmentWhere(scope)

    const filterWhere: Prisma.CourseAssignmentWhereInput = {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
      ...(filters.categoryId ? { course: { categoryId: filters.categoryId } } : {}),
      ...(filters.status ? { status: filters.status as CourseAssignmentStatus } : {}),
      ...(filters.isMandatory !== undefined ? { isMandatory: filters.isMandatory } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.priority ? { priority: filters.priority as CourseAssignmentPriority } : {}),
      ...(filters.overdueOnly
        ? { dueDate: { lt: new Date() }, status: { notIn: TERMINAL_STATUSES } }
        : {}),
    }

    if (scope.allowAll) return filterWhere
    return { AND: [accessWhere, filterWhere] }
  }

  async findAllPaginated(filters: AssignmentFilters, actingEmployeeId: string, page?: number, pageSize?: number): Promise<PaginatedResult<unknown>> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where = this.buildWhere(filters, scope)
    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } = normalizePagination(page, pageSize)

    const [data, total] = await Promise.all([
      this.prisma.courseAssignment.findMany({
        where,
        include: ASSIGNMENT_INCLUDE,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      this.prisma.courseAssignment.count({ where }),
    ])

    return buildPaginatedResult(data, total, normalizedPage, normalizedPageSize)
  }

  async findAll(filters: AssignmentFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where = this.buildWhere(filters, scope)
    return this.prisma.courseAssignment.findMany({
      where,
      include: ASSIGNMENT_INCLUDE,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
      include: { ...ASSIGNMENT_INCLUDE, auditLogs: { orderBy: { createdAt: "desc" }, include: { actor: { select: { firstName: true, lastName: true } } } } },
    })
    if (!assignment) {
      throw new NotFoundException(`Course assignment ${id} not found`)
    }

    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const canAccessViaDepartment = Boolean(assignment.departmentId && scope.departmentIds.includes(assignment.departmentId))
    if (!this.accessService.canAccessEmployee(scope, assignment.employeeId) && !canAccessViaDepartment) {
      throw new ForbiddenException("You don't have access to this course assignment")
    }

    return assignment
  }

  /** Buckets one employee's assignments the way the "My Learning" / Learning
   *  Plan view needs — all computed over the same rows, nothing stored
   *  separately (same reasoning as "overdue" being computed, not stored). */
  async getLearningPlan(employeeId: string, actingEmployeeId: string) {
    const assignments = await this.findAll({ employeeId }, actingEmployeeId)
    const now = new Date()

    const completed = assignments.filter((a) => TERMINAL_STATUSES.includes(a.status))
    const overdue = assignments.filter(
      (a) => a.dueDate && a.dueDate < now && !TERMINAL_STATUSES.includes(a.status)
    )
    const upcoming = assignments.filter(
      (a) => a.dueDate && a.dueDate >= now && !TERMINAL_STATUSES.includes(a.status) && a.status === "ASSIGNED"
    )
    const inProgress = assignments.filter((a) => a.status === "IN_PROGRESS" || a.status === "ACCEPTED")
    const mandatory = assignments.filter((a) => a.isMandatory && !TERMINAL_STATUSES.includes(a.status))
    const optional = assignments.filter((a) => !a.isMandatory && !a.recommendationComment && !TERMINAL_STATUSES.includes(a.status))
    const recommended = assignments.filter((a) => !a.isMandatory && !!a.recommendationComment && !TERMINAL_STATUSES.includes(a.status))

    return { assigned: assignments, completed, overdue, upcoming, inProgress, mandatory, optional, recommended }
  }

  /**
   * Auto-assigns every isActive Course flagged autoAssignOnHire that this
   * employee is eligible for, with dueDate = employmentStartDate +
   * autoAssignDueMonths (default 12 — the "12 months from hire date" AML
   * rule, generalized to any course). Called from
   * EmployeesService.updateEmploymentDetails the first time
   * employmentStartDate is set. Idempotent — skips courses already
   * assigned to this employee, so it's safe to call again on every
   * subsequent employment-details edit.
   */
  async assignAutoHireCourses(employeeId: string, employmentStartDate: Date) {
    const courses = await this.prisma.course.findMany({
      where: { autoAssignOnHire: true, isActive: true },
      include: { category: true },
    })
    if (courses.length === 0) return

    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: employeeId },
      select: {
        employeeNumber: true,
        isActive: true,
        positionId: true,
        bandId: true,
        branchId: true,
        contractType: true,
        position: { select: { departmentId: true, unitId: true, levelId: true, department: { select: { functionId: true } } } },
      },
    })
    if (!employee || !employee.isActive) return

    for (const course of courses) {
      if (!this.coursesService.isEligible(employee, course)) continue

      const existing = await this.prisma.courseAssignment.findUnique({
        where: { courseId_employeeId: { courseId: course.id, employeeId } },
      })
      if (existing) continue

      const dueDate = new Date(employmentStartDate)
      dueDate.setMonth(dueDate.getMonth() + (course.autoAssignDueMonths ?? 12))

      const assignment = await this.prisma.courseAssignment.create({
        data: {
          courseId: course.id,
          employeeId,
          categoryName: course.category.name,
          isMandatory: course.category.isMandatory,
          departmentId: employee.position?.departmentId ?? null,
          unitId: employee.position?.unitId ?? null,
          positionId: employee.positionId,
          levelId: employee.position?.levelId ?? null,
          bandId: employee.bandId,
          branchId: employee.branchId,
          contractType: employee.contractType,
          dueDate,
          priority: CourseAssignmentPriority.CRITICAL,
          reasonForAssignment: "Automatically assigned as mandatory onboarding training.",
        },
      })

      await this.log(assignment.id, "ASSIGNED", null, "Auto-assigned on hire")
      await this.notificationsService.create({
        recipientEmployeeId: employeeId,
        type: NotificationType.COURSE_ASSIGNED,
        title: "Mandatory training assigned",
        message: `"${course.name}" has been assigned — due ${dueDate.toISOString().slice(0, 10)}.`,
      })
      // AML/compliance courses use the isMandatory-template (never
      // suppressible via NotificationPreference — see EmailService), since
      // this whole code path exists specifically for the "AML rule,
      // generalized to any course" auto-hire case per this method's doc
      // comment above.
      await this.safeSendCourseEmail(
        course.category.isMandatory ? "learning_aml_mandatory_reminder" : "learning_course_assigned",
        employeeId,
        course.name,
        dueDate,
        assignment.id
      )
    }
  }

  async create(dto: CreateAssignmentDto) {
    await this.assertActorExists(dto.actingEmployeeId)
    const scope = await this.accessService.resolveScope(dto.actingEmployeeId)

    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId }, include: { category: true } })
    if (!course) {
      throw new NotFoundException(`Course ${dto.courseId} not found`)
    }

    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: dto.employeeId },
      select: {
        employeeNumber: true,
        isActive: true,
        positionId: true,
        bandId: true,
        branchId: true,
        contractType: true,
        position: { select: { departmentId: true, unitId: true, levelId: true, department: { select: { functionId: true } } } },
      },
    })
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`)
    }
    if (!employee.isActive) {
      throw new BadRequestException("This employee is not active.")
    }

    if (!scope.allowAll && !this.accessService.canAccessEmployee(scope, dto.employeeId)) {
      throw new ForbiddenException("You don't have access to assign a course to this employee")
    }

    if (!this.coursesService.isEligible(employee, course)) {
      throw new BadRequestException("This employee does not meet this course's eligibility restrictions.")
    }

    const existing = await this.prisma.courseAssignment.findUnique({
      where: { courseId_employeeId: { courseId: dto.courseId, employeeId: dto.employeeId } },
    })
    if (existing) {
      throw new BadRequestException("This course is already assigned to this employee.")
    }

    const assignment = await this.prisma.courseAssignment.create({
      data: {
        courseId: dto.courseId,
        employeeId: dto.employeeId,
        assignedById: dto.actingEmployeeId,
        categoryName: course.category.name,
        isMandatory: course.category.isMandatory,
        departmentId: employee.position?.departmentId ?? null,
        unitId: employee.position?.unitId ?? null,
        positionId: employee.positionId,
        levelId: employee.position?.levelId ?? null,
        bandId: employee.bandId,
        branchId: employee.branchId,
        contractType: employee.contractType,
        dueDate: dto.dueDate,
        priority: dto.priority ?? CourseAssignmentPriority.MEDIUM,
        recommendationComment: dto.recommendationComment,
        reasonForAssignment: dto.reasonForAssignment,
      },
      include: ASSIGNMENT_INCLUDE,
    })

    await this.log(assignment.id, "ASSIGNED", dto.actingEmployeeId)
    await this.notificationsService.create({
      recipientEmployeeId: dto.employeeId,
      type: NotificationType.COURSE_ASSIGNED,
      title: "New course assigned",
      message: `You've been assigned "${course.name}"${dto.dueDate ? ` — due ${dto.dueDate.toISOString().slice(0, 10)}` : ""}.`,
    })
    await this.safeSendCourseEmail("learning_course_assigned", dto.employeeId, course.name, dto.dueDate ?? null, assignment.id)

    return assignment
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    await this.getWithAccessCheck(id, dto.actingEmployeeId, { requireAdminOrAssigner: true })

    const { actingEmployeeId, ...fields } = dto
    const updated = await this.prisma.courseAssignment.update({
      where: { id },
      data: fields,
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(id, "UPDATED", actingEmployeeId, Object.keys(fields).join(", "))
    return updated
  }

  async accept(id: string, dto: ActingEmployeeDto) {
    const assignment = await this.getWithAccessCheck(id, dto.actingEmployeeId, { requireAssignee: true })
    if (assignment.status !== "ASSIGNED") {
      throw new BadRequestException("Only a newly assigned course can be accepted.")
    }
    const updated = await this.prisma.courseAssignment.update({
      where: { id },
      data: { status: CourseAssignmentStatus.ACCEPTED, acceptedAt: new Date() },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(id, "ACCEPTED", dto.actingEmployeeId)
    return updated
  }

  async start(id: string, dto: ActingEmployeeDto) {
    const assignment = await this.getWithAccessCheck(id, dto.actingEmployeeId, { requireAssignee: true })
    if (assignment.status !== "ASSIGNED" && assignment.status !== "ACCEPTED") {
      throw new BadRequestException("This course has already been started.")
    }
    const updated = await this.prisma.courseAssignment.update({
      where: { id },
      data: {
        status: CourseAssignmentStatus.IN_PROGRESS,
        startedAt: new Date(),
        ...(assignment.status === "ASSIGNED" ? { acceptedAt: new Date() } : {}),
      },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(id, "STARTED", dto.actingEmployeeId)
    return updated
  }

  async markCompleted(id: string, dto: ActingEmployeeDto) {
    const assignment = await this.getWithAccessCheck(id, dto.actingEmployeeId, { requireAssignee: true })
    if (!["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(assignment.status)) {
      throw new BadRequestException("This course is already marked completed or further along.")
    }
    const updated = await this.prisma.courseAssignment.update({
      where: { id },
      data: { status: CourseAssignmentStatus.COMPLETED_BY_EMPLOYEE, completedAt: new Date() },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(id, "COMPLETED_BY_EMPLOYEE", dto.actingEmployeeId)
    return updated
  }

  async submitCertificate(id: string, dto: SubmitCertificateDto) {
    const assignment = await this.getWithAccessCheck(id, dto.actingEmployeeId, { requireAssignee: true })
    if (assignment.status !== "COMPLETED_BY_EMPLOYEE" && assignment.status !== "REJECTED") {
      throw new BadRequestException("Confirm course completion before uploading a certificate.")
    }
    const updated = await this.prisma.courseAssignment.update({
      where: { id },
      data: {
        status: CourseAssignmentStatus.PENDING_VERIFICATION,
        certificateUploadedAt: new Date(),
        certificateUrl: dto.certificateUrl,
        employeeCertificateComment: dto.employeeCertificateComment ?? null,
        rejectedAt: null,
      },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(id, "CERTIFICATE_SUBMITTED", dto.actingEmployeeId)
    return updated
  }

  async verify(id: string, dto: VerifyCertificateDto) {
    await this.assertIsAdmin(dto.actingEmployeeId)
    const assignment = await this.prisma.courseAssignment.findUnique({ where: { id } })
    if (!assignment) {
      throw new NotFoundException(`Course assignment ${id} not found`)
    }
    if (assignment.status !== "PENDING_VERIFICATION") {
      throw new BadRequestException("Only a submission awaiting verification can be verified.")
    }

    const updated = await this.prisma.courseAssignment.update({
      where: { id },
      data: {
        status: CourseAssignmentStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedById: dto.actingEmployeeId,
        hrVerificationComment: dto.hrVerificationComment ?? null,
      },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(id, "VERIFIED", dto.actingEmployeeId)
    await this.notificationsService.create({
      recipientEmployeeId: assignment.employeeId,
      type: NotificationType.CERTIFICATE_APPROVED,
      title: "Certificate approved",
      message: "Your course certificate has been verified — the course is now marked complete.",
    })
    return updated
  }

  async reject(id: string, dto: RejectCertificateDto) {
    await this.assertIsAdmin(dto.actingEmployeeId)
    const assignment = await this.prisma.courseAssignment.findUnique({ where: { id } })
    if (!assignment) {
      throw new NotFoundException(`Course assignment ${id} not found`)
    }
    if (assignment.status !== "PENDING_VERIFICATION") {
      throw new BadRequestException("Only a submission awaiting verification can be rejected.")
    }

    const updated = await this.prisma.courseAssignment.update({
      where: { id },
      data: {
        status: CourseAssignmentStatus.REJECTED,
        rejectedAt: new Date(),
        verifiedById: dto.actingEmployeeId,
        hrVerificationComment: dto.hrVerificationComment,
      },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(id, "REJECTED", dto.actingEmployeeId, dto.hrVerificationComment)
    await this.notificationsService.create({
      recipientEmployeeId: assignment.employeeId,
      type: NotificationType.CERTIFICATE_REJECTED,
      title: "Certificate rejected",
      message: `Your certificate submission was rejected: ${dto.hrVerificationComment}`,
    })
    return updated
  }

  async close(id: string, dto: ActingEmployeeDto) {
    await this.assertIsAdmin(dto.actingEmployeeId)
    const assignment = await this.prisma.courseAssignment.findUnique({ where: { id } })
    if (!assignment) {
      throw new NotFoundException(`Course assignment ${id} not found`)
    }
    if (assignment.status !== "VERIFIED") {
      throw new BadRequestException("Only a verified course can be closed.")
    }

    const updated = await this.prisma.courseAssignment.update({
      where: { id },
      data: { status: CourseAssignmentStatus.CLOSED, closedAt: new Date() },
      include: ASSIGNMENT_INCLUDE,
    })
    await this.log(id, "CLOSED", dto.actingEmployeeId)
    return updated
  }

  private async getWithAccessCheck(
    id: string,
    actingEmployeeId: string,
    opts: { requireAssignee?: boolean; requireAdminOrAssigner?: boolean }
  ) {
    const assignment = await this.prisma.courseAssignment.findUnique({ where: { id } })
    if (!assignment) {
      throw new NotFoundException(`Course assignment ${id} not found`)
    }

    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId } })
    if (!actor) {
      throw new NotFoundException(`Employee ${actingEmployeeId} not found`)
    }

    if (opts.requireAssignee) {
      if (!actor.isAdmin && assignment.employeeId !== actingEmployeeId) {
        throw new ForbiddenException("Only the assigned employee can perform this action")
      }
    }

    if (opts.requireAdminOrAssigner) {
      const isAssigner = assignment.assignedById === actingEmployeeId
      if (!actor.isAdmin && !isAssigner) {
        throw new ForbiddenException("Only an HR administrator or the person who assigned this course can edit it")
      }
    }

    return assignment
  }

  private async assertActorExists(actingEmployeeId: string) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId } })
    if (!actor) {
      throw new NotFoundException(`Employee ${actingEmployeeId} not found`)
    }
    return actor
  }

  private async assertIsAdmin(actingEmployeeId: string) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId } })
    if (!actor?.isAdmin) {
      throw new ForbiddenException("Only an HR administrator can perform this action")
    }
  }

  private async log(assignmentId: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.courseAuditLog.create({
      data: { assignmentId, action, actorId, notes: notes || null },
    })
  }
}
