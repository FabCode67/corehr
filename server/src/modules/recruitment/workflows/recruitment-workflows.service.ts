import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { ContractType, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { RecruitmentAccessService } from "../access/recruitment-access.service"

import { CreateWorkflowDto, SetWorkflowStagesDto, UpdateWorkflowDto } from "./dto/upsert-workflow.dto"

const WORKFLOW_INCLUDE = {
  stages: { include: { stage: true }, orderBy: { sequence: "asc" } },
} as const

/**
 * CRUD for the Band/contract-type -> stage-list workflow config — the
 * "policy-driven recruitment process" the ATS spec asks for (see the
 * schema's doc comment on RecruitmentWorkflow). Writes are HR-
 * Administrator-only, same reasoning as RecruitmentStageDefinitionsService.
 */
@Injectable()
export class RecruitmentWorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: RecruitmentAccessService
  ) {}

  private async assertAdmin(actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll) {
      throw new ForbiddenException("Only HR Administrators can edit recruitment workflows.")
    }
  }

  findAll(includeInactive = false) {
    return this.prisma.recruitmentWorkflow.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: WORKFLOW_INCLUDE,
      orderBy: [{ isDefault: "asc" }, { minBandRank: "asc" }, { name: "asc" }],
    })
  }

  async findOne(id: string) {
    const workflow = await this.prisma.recruitmentWorkflow.findUnique({ where: { id }, include: WORKFLOW_INCLUDE })
    if (!workflow) {
      throw new NotFoundException(`Recruitment workflow ${id} not found`)
    }
    return workflow
  }

  async create(dto: CreateWorkflowDto) {
    await this.assertAdmin(dto.actingEmployeeId)
    try {
      return await this.prisma.recruitmentWorkflow.create({
        data: {
          name: dto.name,
          description: dto.description,
          isDefault: dto.isDefault ?? false,
          minBandRank: dto.minBandRank,
          maxBandRank: dto.maxBandRank,
          contractTypes: dto.contractTypes ?? [],
        },
        include: WORKFLOW_INCLUDE,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`A workflow named "${dto.name}" already exists.`)
      }
      throw error
    }
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    await this.assertAdmin(dto.actingEmployeeId)
    const { actingEmployeeId, ...fields } = dto
    await this.findOne(id)
    return this.prisma.recruitmentWorkflow.update({ where: { id }, data: fields, include: WORKFLOW_INCLUDE })
  }

  async deactivate(id: string, actingEmployeeId: string) {
    await this.assertAdmin(actingEmployeeId)
    const workflow = await this.findOne(id)
    if (workflow.isDefault) {
      throw new BadRequestException("The default workflow can't be deactivated — every application needs a fallback to resolve to. Mark a different workflow as default first.")
    }
    return this.prisma.recruitmentWorkflow.update({ where: { id }, data: { isActive: false } })
  }

  /** Replaces the workflow's ordered stage list wholesale — see
   *  SetWorkflowStagesDto's doc comment. */
  async setStages(id: string, dto: SetWorkflowStagesDto) {
    await this.assertAdmin(dto.actingEmployeeId)
    await this.findOne(id)

    if (dto.stageIds.length === 0) {
      throw new BadRequestException("A workflow needs at least one stage.")
    }
    const validStages = await this.prisma.recruitmentStageDefinition.count({ where: { id: { in: dto.stageIds }, isActive: true } })
    if (validStages !== dto.stageIds.length) {
      throw new BadRequestException("One or more selected stages don't exist or are inactive.")
    }

    await this.prisma.$transaction([
      this.prisma.recruitmentWorkflowStage.deleteMany({ where: { workflowId: id } }),
      this.prisma.recruitmentWorkflowStage.createMany({
        data: dto.stageIds.map((stageId, index) => ({ workflowId: id, stageId, sequence: index + 1 })),
      }),
    ])
    return this.findOne(id)
  }

  /**
   * Resolves which workflow applies to a given band/contract-type
   * combination — called once at Application creation (see
   * ApplicationsService.create()). Precedence:
   *   1. Among workflows whose filters (band range and/or contract type,
   *      whichever are set) all match, the one with the MOST filter
   *      dimensions set wins (a workflow matching on both band and
   *      contract type beats one matching on only one).
   *   2. Ties broken by the narrowest band-rank range (a workflow scoped
   *      to exactly one band beats one spanning several).
   *   3. If nothing matches, the workflow with isDefault: true is used.
   * Throws if no default is configured at all — that's a genuine setup
   * error HR needs to fix (see seedRecruitmentStageEngine for the baseline).
   */
  async resolveWorkflowFor(params: { bandId?: string | null; contractType?: ContractType | null }) {
    const workflows = await this.prisma.recruitmentWorkflow.findMany({ where: { isActive: true } })

    let bandRank: number | null = null
    if (params.bandId) {
      const band = await this.prisma.band.findUnique({ where: { id: params.bandId }, select: { rank: true } })
      bandRank = band?.rank ?? null
    }

    const candidates = workflows
      .filter((w) => !w.isDefault)
      .map((workflow) => {
        const hasBandFilter = workflow.minBandRank !== null || workflow.maxBandRank !== null
        const hasContractFilter = workflow.contractTypes.length > 0
        const bandOk = !hasBandFilter || (bandRank !== null && bandRank >= (workflow.minBandRank ?? -Infinity) && bandRank <= (workflow.maxBandRank ?? Infinity))
        const contractOk = !hasContractFilter || (params.contractType != null && workflow.contractTypes.includes(params.contractType))
        const matches = (hasBandFilter || hasContractFilter) && bandOk && contractOk
        const specificity = (hasBandFilter ? 1 : 0) + (hasContractFilter ? 1 : 0)
        const rangeWidth = workflow.minBandRank !== null && workflow.maxBandRank !== null ? workflow.maxBandRank - workflow.minBandRank : Number.POSITIVE_INFINITY
        return { workflow, matches, specificity, rangeWidth }
      })
      .filter((c) => c.matches)
      .sort((a, b) => b.specificity - a.specificity || a.rangeWidth - b.rangeWidth)

    if (candidates.length > 0) return candidates[0].workflow

    const fallback = workflows.find((w) => w.isDefault)
    if (!fallback) {
      throw new NotFoundException("No default recruitment workflow is configured — set one workflow's isDefault flag before applications can be created.")
    }
    return fallback
  }
}
