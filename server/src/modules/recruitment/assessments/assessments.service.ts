import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { RecruitmentAccessService } from "../access/recruitment-access.service"

import { CreateAssessmentDto } from "./dto/create-assessment.dto"
import { RecordAssessmentResultDto } from "./dto/record-assessment-result.dto"
import { UpdateAssessmentDto } from "./dto/update-assessment.dto"
import { PrismaService } from "../../../prisma/prisma.service"

const ASSESSMENT_INCLUDE = {
  evaluator: { select: { employeeNumber: true, firstName: true, lastName: true } },
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
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService
  ) {}

  async findAll(applicationId: string | undefined, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    return this.prisma.assessment.findMany({
      where: {
        ...(applicationId ? { applicationId } : {}),
        ...(scope.allowAll ? {} : { application: this.accessService.buildApplicationWhere(scope) }),
      },
      include: ASSESSMENT_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id }, include: ASSESSMENT_INCLUDE })
    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && !this.accessService.canAccessRequisition(scope, assessment.application.jobPosting.requisition)) {
      throw new ForbiddenException("You don't have access to this assessment")
    }
    return assessment
  }

  async create(dto: CreateAssessmentDto, actingEmployeeId: string) {
    const application = await this.prisma.application.findUnique({ where: { id: dto.applicationId } })
    if (!application) {
      throw new NotFoundException(`Application ${dto.applicationId} not found`)
    }
    const assessment = await this.prisma.assessment.create({ data: dto, include: ASSESSMENT_INCLUDE })
    await this.log(assessment.id, "CREATED", actingEmployeeId)
    return assessment
  }

  async update(id: string, dto: UpdateAssessmentDto, actingEmployeeId: string) {
    await this.findOne(id, actingEmployeeId)
    const updated = await this.prisma.assessment.update({ where: { id }, data: dto, include: ASSESSMENT_INCLUDE })
    await this.log(id, "UPDATED", actingEmployeeId)
    return updated
  }

  async recordResult(id: string, dto: RecordAssessmentResultDto) {
    await this.findOne(id, dto.actingEmployeeId)
    const updated = await this.prisma.assessment.update({
      where: { id },
      data: { score: dto.score, maxScore: dto.maxScore, result: dto.result, comments: dto.comments },
      include: ASSESSMENT_INCLUDE,
    })
    await this.log(id, "RESULT_RECORDED", dto.actingEmployeeId, dto.result)
    return updated
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.recruitmentAuditLog.create({
      data: { entityType: "Assessment", entityId: id, action, actorId, notes: notes || null },
    })
  }
}
