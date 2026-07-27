import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { RecruitmentAccessService } from "../access/recruitment-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateBackgroundCheckDto } from "./dto/create-background-check.dto"
import { UpdateBackgroundCheckStatusDto } from "./dto/update-background-check-status.dto"

const BACKGROUND_CHECK_INCLUDE = {
  application: {
    select: {
      id: true,
      candidate: { select: { id: true, firstName: true, lastName: true } },
      jobPosting: {
        select: {
          id: true,
          postingTitle: true,
          requisition: { select: { id: true, recruiterId: true, hiringManagerId: true, departmentId: true } },
        },
      },
    },
  },
} as const

@Injectable()
export class BackgroundChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService
  ) {}

  async findAll(applicationId: string | undefined, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.prisma.backgroundCheck.findMany({
      where: {
        ...(applicationId ? { applicationId } : {}),
        ...(scope.allowAll ? {} : { application: this.accessService.buildApplicationWhere(scope) }),
      },
      include: BACKGROUND_CHECK_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const check = await this.prisma.backgroundCheck.findUnique({ where: { id }, include: BACKGROUND_CHECK_INCLUDE })
    if (!check) {
      throw new NotFoundException(`Background check ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && !this.accessService.canAccessRequisition(scope, check.application.jobPosting.requisition)) {
      throw new ForbiddenException("You don't have access to this background check")
    }
    return check
  }

  async create(dto: CreateBackgroundCheckDto, actingEmployeeId: string) {
    const application = await this.prisma.application.findUnique({ where: { id: dto.applicationId } })
    if (!application) {
      throw new NotFoundException(`Application ${dto.applicationId} not found`)
    }
    const check = await this.prisma.backgroundCheck.create({ data: dto, include: BACKGROUND_CHECK_INCLUDE })
    await this.log(check.id, "CREATED", actingEmployeeId)
    return check
  }

  async updateStatus(id: string, dto: UpdateBackgroundCheckStatusDto) {
    await this.findOne(id, dto.actingEmployeeId)
    const updated = await this.prisma.backgroundCheck.update({
      where: { id },
      data: {
        status: dto.status,
        comments: dto.comments,
        completedAt: dto.status === "PENDING" ? null : new Date(),
      },
      include: BACKGROUND_CHECK_INCLUDE,
    })
    await this.log(id, "STATUS_CHANGED", dto.actingEmployeeId, dto.status)
    return updated
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "BackgroundCheck", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
