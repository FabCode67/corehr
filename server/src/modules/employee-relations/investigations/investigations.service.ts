import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { DisciplinaryCasesService } from "../cases/disciplinary-cases.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { CompleteInvestigationDto } from "./dto/complete-investigation.dto"
import { CreateInvestigationDto } from "./dto/create-investigation.dto"
import { UpdateInvestigationDto } from "./dto/update-investigation.dto"

const INVESTIGATION_INCLUDE = {
  investigator: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

/**
 * Investigation records are permanently linked to their DisciplinaryCase
 * (see schema module doc comment) — every mutation here goes through
 * DisciplinaryCasesService.findOne() first so the same confidentiality/
 * line-manager access rule applies to investigation data as to the case
 * itself.
 */
@Injectable()
export class InvestigationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casesService: DisciplinaryCasesService
  ) {}

  private async findInvestigationOrThrow(caseId: string, investigationId: string) {
    const investigation = await this.prisma.investigation.findUnique({ where: { id: investigationId }, include: INVESTIGATION_INCLUDE })
    if (!investigation || investigation.disciplinaryCaseId !== caseId) {
      throw new NotFoundException(`Investigation ${investigationId} not found on this case`)
    }
    return investigation
  }

  async create(caseId: string, dto: CreateInvestigationDto) {
    const disciplinaryCase = await this.casesService.findOne(caseId, dto.actingEmployeeId)
    if (disciplinaryCase.status !== "UNDER_INVESTIGATION") {
      throw new BadRequestException("An investigation can only be opened once the case is Under Investigation — submit the case first.")
    }

    const investigation = await this.prisma.investigation.create({
      data: { disciplinaryCaseId: caseId, investigatorId: dto.investigatorId, startDate: dto.startDate, dueDate: dto.dueDate },
      include: INVESTIGATION_INCLUDE,
    })
    await this.log(caseId, "INVESTIGATION_OPENED", dto.actingEmployeeId, `Investigator: ${dto.investigatorId}`)
    return investigation
  }

  async update(caseId: string, investigationId: string, dto: UpdateInvestigationDto) {
    await this.casesService.findOne(caseId, dto.actingEmployeeId)
    await this.findInvestigationOrThrow(caseId, investigationId)

    const { actingEmployeeId, ...data } = dto
    const updated = await this.prisma.investigation.update({ where: { id: investigationId }, data, include: INVESTIGATION_INCLUDE })
    await this.log(caseId, "INVESTIGATION_UPDATED", actingEmployeeId)
    return updated
  }

  /** Marks the investigation COMPLETED and advances the case to
   *  PENDING_DECISION — see schema module doc comment's simplification: a
   *  case with more than one investigation still advances on the first one
   *  to complete. */
  async complete(caseId: string, investigationId: string, dto: CompleteInvestigationDto) {
    const disciplinaryCase = await this.casesService.findOne(caseId, dto.actingEmployeeId)
    const investigation = await this.findInvestigationOrThrow(caseId, investigationId)
    if (investigation.status === "COMPLETED") {
      throw new BadRequestException("This investigation has already been completed.")
    }

    const updated = await this.prisma.investigation.update({
      where: { id: investigationId },
      data: { status: "COMPLETED", endDate: new Date(), summary: dto.summary, findings: dto.findings, recommendation: dto.recommendation },
      include: INVESTIGATION_INCLUDE,
    })

    if (disciplinaryCase.status === "UNDER_INVESTIGATION") {
      await this.prisma.disciplinaryCase.update({ where: { id: caseId }, data: { status: "PENDING_DECISION" } })
    }

    await this.log(caseId, "INVESTIGATION_COMPLETED", dto.actingEmployeeId)
    return updated
  }

  private async log(caseId: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.employeeRelationsAuditLog.create({ data: { entityType: "DisciplinaryCase", entityId: caseId, action, actorId, notes: notes || null } })
  }
}
