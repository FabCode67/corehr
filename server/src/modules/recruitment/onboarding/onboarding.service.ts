import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { OnboardingTaskType } from "@prisma/client"

import { EmployeesService } from "../../employees/employees.service"
import { RecruitmentAccessService } from "../access/recruitment-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { CompleteOnboardingDto } from "./dto/complete-onboarding.dto"
import { UpdateOnboardingTaskDto } from "./dto/update-onboarding-task.dto"

const APPLICATION_ACCESS_INCLUDE = {
  jobPosting: {
    select: { requisition: { select: { id: true, recruiterId: true, hiringManagerId: true, departmentId: true } } },
  },
} as const

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService,
    private readonly employeesService: EmployeesService
  ) {}

  private async findApplicationOrThrow(applicationId: string, actingEmployeeId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: APPLICATION_ACCESS_INCLUDE,
    })
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && !this.accessService.canAccessRequisition(scope, application.jobPosting.requisition)) {
      throw new ForbiddenException("You don't have access to this application's onboarding")
    }
    return application
  }

  async getTasks(applicationId: string, actingEmployeeId: string) {
    await this.findApplicationOrThrow(applicationId, actingEmployeeId)
    return this.prisma.onboardingTask.findMany({
      where: { applicationId },
      include: { completedBy: { select: { employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { taskType: "asc" },
    })
  }

  async updateTask(applicationId: string, taskType: OnboardingTaskType, dto: UpdateOnboardingTaskDto) {
    await this.findApplicationOrThrow(applicationId, dto.actingEmployeeId)

    if (taskType === "EMPLOYEE_NUMBER_CREATED") {
      throw new BadRequestException(
        "EMPLOYEE_NUMBER_CREATED is completed automatically when onboarding finishes — it can't be toggled manually."
      )
    }

    const task = await this.prisma.onboardingTask.findUnique({
      where: { applicationId_taskType: { applicationId, taskType } },
    })
    if (!task) {
      throw new NotFoundException(
        `Onboarding task ${taskType} not found for this application — the checklist is only created once an offer is accepted.`
      )
    }

    const updated = await this.prisma.onboardingTask.update({
      where: { id: task.id },
      data: {
        isCompleted: dto.isCompleted,
        notes: dto.notes,
        completedById: dto.isCompleted ? dto.actingEmployeeId : null,
        completedAt: dto.isCompleted ? new Date() : null,
      },
      include: { completedBy: { select: { employeeNumber: true, firstName: true, lastName: true } } },
    })

    await this.log(applicationId, dto.isCompleted ? "TASK_COMPLETED" : "TASK_REOPENED", dto.actingEmployeeId, taskType)
    return updated
  }

  /**
   * The final onboarding action. Requires: an ACCEPTED offer, every
   * checklist item other than EMPLOYEE_NUMBER_CREATED complete, and no
   * prior hire recorded against this application. Creates the real
   * Employee record (reusing EmployeesService.create/assignPosition/
   * updateEmploymentDetails — the same wizard steps used for direct hires),
   * which also triggers the Learning module's mandatory AML training
   * assignment as a side effect of setting employmentStartDate — see
   * module doc comment.
   */
  async completeOnboarding(applicationId: string, dto: CompleteOnboardingDto) {
    await this.findApplicationOrThrow(applicationId, dto.actingEmployeeId)

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        offers: { where: { status: "ACCEPTED" }, orderBy: { respondedAt: "desc" }, take: 1 },
        onboardingTasks: true,
      },
    })
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`)
    }
    if (application.hiredEmployeeNumber) {
      throw new BadRequestException("This application has already completed onboarding.")
    }

    const offer = application.offers[0]
    if (!offer) {
      throw new BadRequestException("This application has no accepted offer — onboarding can't be completed yet.")
    }

    const outstanding = application.onboardingTasks.filter(
      (task) => task.taskType !== "EMPLOYEE_NUMBER_CREATED" && !task.isCompleted
    )
    if (outstanding.length > 0) {
      throw new BadRequestException(
        `The onboarding checklist isn't complete yet: ${outstanding.map((task) => task.taskType).join(", ")}`
      )
    }

    const employmentStartDate = dto.employmentStartDate ?? offer.proposedStartDate

    const employee = await this.employeesService.create({
      firstName: application.candidate.firstName,
      lastName: application.candidate.lastName,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth,
      nationalIdNumber: dto.nationalIdNumber,
      nationality: application.candidate.nationality,
      maritalStatus: dto.maritalStatus,
      email: application.candidate.email,
      phone: application.candidate.phone,
      branchId: offer.branchId,
      profilePictureUrl: dto.profilePictureUrl,
      reportingManagerOverrideId: dto.reportingManagerOverrideId,
    })

    await this.employeesService.assignPosition(employee.employeeNumber, {
      positionId: offer.positionId,
      bandId: offer.bandId,
      effectiveFrom: employmentStartDate,
      reportingManagerOverrideId: dto.reportingManagerOverrideId,
    })

    // Also assigns mandatory AML training automatically — see doc comment.
    await this.employeesService.updateEmploymentDetails(employee.employeeNumber, {
      contractType: offer.contractType,
      employmentStartDate,
      probationEndDate: dto.probationEndDate,
      contractEndDate: dto.contractEndDate,
    })

    const [updatedApplication] = await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: "HIRED", hiredEmployeeNumber: employee.employeeNumber },
      }),
      this.prisma.onboardingTask.update({
        where: { applicationId_taskType: { applicationId, taskType: "EMPLOYEE_NUMBER_CREATED" } },
        data: { isCompleted: true, completedById: dto.actingEmployeeId, completedAt: new Date() },
      }),
    ])

    await this.log(applicationId, "ONBOARDING_COMPLETED", dto.actingEmployeeId, employee.employeeNumber)

    return { employee, application: updatedApplication }
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "Application", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
