import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"

import { PerformanceReviewType } from "@prisma/client"

import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"

import { CreateReviewPeriodDto } from "./dto/create-review-period.dto"
import { UpdateReviewPeriodDto } from "./dto/update-review-period.dto"

/**
 * One row per performance year, holding two independently opened/closed
 * sub-cycles (Mid-Year, Annual). Opening/closing a cycle is the gate that
 * controls whether PerformanceReviewsService will create/submit reviews for
 * it — see the checks there.
 */
@Injectable()
export class ReviewPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  findAll() {
    return this.prisma.performanceReviewPeriod.findMany({ orderBy: { year: "desc" } })
  }

  async findOne(id: string) {
    const period = await this.prisma.performanceReviewPeriod.findUnique({ where: { id } })

    if (!period) {
      throw new NotFoundException(`Review period ${id} not found`)
    }

    return period
  }

  async create(dto: CreateReviewPeriodDto) {
    const existing = await this.prisma.performanceReviewPeriod.findFirst({
      where: { OR: [{ name: dto.name }, { year: dto.year }] },
    })

    if (existing) {
      throw new ConflictException("A review period with this name or year already exists")
    }

    return this.prisma.performanceReviewPeriod.create({ data: dto })
  }

  async update(id: string, dto: UpdateReviewPeriodDto) {
    await this.findOne(id)

    if (dto.name || dto.year !== undefined) {
      const existing = await this.prisma.performanceReviewPeriod.findFirst({
        where: {
          OR: [...(dto.name ? [{ name: dto.name }] : []), ...(dto.year !== undefined ? [{ year: dto.year }] : [])],
          NOT: { id },
        },
      })

      if (existing) {
        throw new ConflictException("A review period with this name or year already exists")
      }
    }

    return this.prisma.performanceReviewPeriod.update({ where: { id }, data: dto })
  }

  async openCycle(id: string, cycle: PerformanceReviewType) {
    const period = await this.findOne(id)

    if (cycle === PerformanceReviewType.MID_YEAR) {
      if (period.midYearStatus === "CLOSED") {
        throw new BadRequestException("This Mid-Year cycle has already been closed and cannot be reopened")
      }
      const updated = await this.prisma.performanceReviewPeriod.update({
        where: { id },
        data: { midYearStatus: "OPEN", midYearOpensAt: new Date() },
      })
      await this.notifyAllEmployeesCycleOpen(updated.name, cycle, updated.midYearDeadline)
      return updated
    }

    if (period.annualStatus === "CLOSED") {
      throw new BadRequestException("This Annual cycle has already been closed and cannot be reopened")
    }
    const updated = await this.prisma.performanceReviewPeriod.update({
      where: { id },
      data: { annualStatus: "OPEN", annualOpensAt: new Date() },
    })
    await this.notifyAllEmployeesCycleOpen(updated.name, cycle, updated.annualDeadline)
    return updated
  }

  /** Fires "self-appraisal is now open" to every active employee — this is
   *  the one PerformanceReview email trigger that doesn't depend on a
   *  PerformanceReview row existing yet (those are created lazily, per
   *  employee, only once someone actually starts their self-appraisal — see
   *  ReviewsService.create()), so "all active employees" is the only
   *  correct audience at open time. Best-effort per recipient: one bad
   *  email address should never block the other 500. */
  private async notifyAllEmployeesCycleOpen(periodName: string, cycle: PerformanceReviewType, deadline: Date | null) {
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true },
      select: { employeeNumber: true, email: true, firstName: true, lastName: true },
    })
    const reviewPeriodLabel = `${periodName} ${cycle === "MID_YEAR" ? "Mid-Year" : "Annual"}`
    const deadlineLabel = deadline ? deadline.toISOString().slice(0, 10) : "to be confirmed by HR"

    await Promise.all(
      employees.map((employee) =>
        this.emailService
          .enqueue({
            templateKey: "performance_self_appraisal_open",
            recipientEmail: employee.email,
            recipientEmployeeId: employee.employeeNumber,
            relatedModule: "performance",
            relatedEntityId: `${periodName}:${cycle}`,
            variables: {
              employee_name: `${employee.firstName} ${employee.lastName}`,
              review_period: reviewPeriodLabel,
              deadline: deadlineLabel,
              review_url: buildClientUrl("/staff/performance"),
            },
          })
          .catch(() => undefined)
      )
    )
  }

  async closeCycle(id: string, cycle: PerformanceReviewType) {
    const period = await this.findOne(id)

    if (cycle === PerformanceReviewType.MID_YEAR) {
      if (period.midYearStatus !== "OPEN") {
        throw new BadRequestException("Only an open Mid-Year cycle can be closed")
      }
      return this.prisma.performanceReviewPeriod.update({
        where: { id },
        data: { midYearStatus: "CLOSED", midYearClosesAt: new Date() },
      })
    }

    if (period.annualStatus !== "OPEN") {
      throw new BadRequestException("Only an open Annual cycle can be closed")
    }
    return this.prisma.performanceReviewPeriod.update({
      where: { id },
      data: { annualStatus: "CLOSED", annualClosesAt: new Date() },
    })
  }

  /** Used by PerformanceReviewsService to enforce the cycle is open before allowing writes. */
  async assertCycleOpen(id: string, cycle: PerformanceReviewType) {
    const period = await this.findOne(id)
    const status = cycle === PerformanceReviewType.MID_YEAR ? period.midYearStatus : period.annualStatus

    if (status !== "OPEN") {
      throw new BadRequestException(
        `The ${cycle === "MID_YEAR" ? "Mid-Year" : "Annual"} cycle for ${period.name} is not open`
      )
    }

    return period
  }
}
