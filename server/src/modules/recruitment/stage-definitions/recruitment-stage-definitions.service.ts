import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { RecruitmentAccessService } from "../access/recruitment-access.service"

import { CreateStageDefinitionDto, UpdateStageDefinitionDto } from "./dto/upsert-stage-definition.dto"
import { UpsertScoringCriterionDto } from "./dto/upsert-scoring-criterion.dto"

const STAGE_DEFINITION_INCLUDE = {
  scoringCriteria: { orderBy: { sortOrder: "asc" } },
} as const

/**
 * CRUD for the HR-editable recruitment stage catalog — see the schema's
 * doc comment on RecruitmentStageDefinition. Reads are open to any
 * recruitment-scoped user (the score-entry UI and workflow builder both
 * need the catalog); writes are HR-Administrator-only per the spec's RBAC
 * table, since this is org-wide policy configuration, not a
 * requisition-scoped operation like the rest of this module.
 */
@Injectable()
export class RecruitmentStageDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService
  ) {}

  private async assertAdmin(actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll) {
      throw new ForbiddenException("Only HR Administrators can edit the recruitment stage catalog.")
    }
  }

  findAll(includeInactive = false) {
    return this.prisma.recruitmentStageDefinition.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: STAGE_DEFINITION_INCLUDE,
      orderBy: { sortOrderHint: "asc" },
    })
  }

  async findOne(id: string) {
    const stage = await this.prisma.recruitmentStageDefinition.findUnique({ where: { id }, include: STAGE_DEFINITION_INCLUDE })
    if (!stage) {
      throw new NotFoundException(`Recruitment stage ${id} not found`)
    }
    return stage
  }

  async create(dto: CreateStageDefinitionDto) {
    await this.assertAdmin(dto.actingEmployeeId)
    try {
      return await this.prisma.recruitmentStageDefinition.create({
        data: {
          key: dto.key,
          name: dto.name,
          description: dto.description,
          stageType: dto.stageType,
          isScored: dto.isScored ?? false,
          sortOrderHint: dto.sortOrderHint ?? 0,
          isSystem: false,
        },
        include: STAGE_DEFINITION_INCLUDE,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`A stage with key "${dto.key}" already exists.`)
      }
      throw error
    }
  }

  async update(id: string, dto: UpdateStageDefinitionDto) {
    await this.assertAdmin(dto.actingEmployeeId)
    const { actingEmployeeId, ...fields } = dto
    await this.findOne(id)
    return this.prisma.recruitmentStageDefinition.update({ where: { id }, data: fields, include: STAGE_DEFINITION_INCLUDE })
  }

  /** No hard delete — a stage may already be referenced by
   *  RecruitmentWorkflowStage rows and ApplicationStageInstance history,
   *  same "deactivate, don't delete" reasoning as Employee/Position
   *  soft-deletes elsewhere in this codebase. Deactivating removes it from
   *  future workflow-builder pick-lists without breaking anything already
   *  referencing it. */
  async deactivate(id: string, actingEmployeeId: string) {
    await this.assertAdmin(actingEmployeeId)
    const stage = await this.findOne(id)
    if (stage.isSystem) {
      throw new BadRequestException("Built-in stages can be edited but not removed — deactivate a custom stage you created instead.")
    }
    return this.prisma.recruitmentStageDefinition.update({ where: { id }, data: { isActive: false } })
  }

  async upsertCriterion(stageId: string, dto: UpsertScoringCriterionDto) {
    await this.assertAdmin(dto.actingEmployeeId)
    await this.findOne(stageId)
    return this.prisma.recruitmentScoringCriterion.upsert({
      where: { stageId_name: { stageId, name: dto.name } },
      create: {
        stageId,
        name: dto.name,
        description: dto.description,
        maxScore: dto.maxScore ?? 5,
        sortOrder: dto.sortOrder ?? 0,
      },
      update: {
        description: dto.description,
        maxScore: dto.maxScore,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    })
  }

  async removeCriterion(criterionId: string, actingEmployeeId: string) {
    await this.assertAdmin(actingEmployeeId)
    await this.prisma.recruitmentScoringCriterion.delete({ where: { id: criterionId } })
  }
}
