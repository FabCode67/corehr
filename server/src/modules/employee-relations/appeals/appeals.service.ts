import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { DisciplinaryCasesService } from "../cases/disciplinary-cases.service"
import { EmployeeRelationsAccessService } from "../access/employee-relations-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateAppealDto } from "./dto/create-appeal.dto"
import { DecideAppealDto } from "./dto/decide-appeal.dto"

const APPEAL_INCLUDE = {
  decidedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

const APPEALABLE_STATUSES = ["SANCTION_ISSUED", "CLOSED"]

/**
 * Appeals stay permanently linked to their originating DisciplinaryCase —
 * see schema module doc comment. Submitting one moves the case to
 * APPEALED; deciding one always finalizes the case back to CLOSED (this
 * module doesn't model a "reopen for re-decision" path — see doc comment).
 */
@Injectable()
export class AppealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casesService: DisciplinaryCasesService,
    private readonly accessService: EmployeeRelationsAccessService
  ) {}

  async findForCase(caseId: string, actingEmployeeId: string) {
    await this.casesService.findOne(caseId, actingEmployeeId)
    return this.prisma.appeal.findMany({ where: { disciplinaryCaseId: caseId }, include: APPEAL_INCLUDE, orderBy: { appealDate: "desc" } })
  }

  async findOne(caseId: string, appealId: string, actingEmployeeId: string) {
    await this.casesService.findOne(caseId, actingEmployeeId)
    const appeal = await this.prisma.appeal.findUnique({ where: { id: appealId }, include: APPEAL_INCLUDE })
    if (!appeal || appeal.disciplinaryCaseId !== caseId) {
      throw new NotFoundException(`Appeal ${appealId} not found on this case`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!this.accessService.canAccessAppeal(scope, appeal)) {
      throw new ForbiddenException("You don't have access to this appeal")
    }
    return appeal
  }

  /** Only the case's own employee can appeal it, and only once a final
   *  decision exists (a sanction was issued, or the case was closed
   *  without one). */
  async create(caseId: string, dto: CreateAppealDto) {
    const disciplinaryCase = await this.casesService.findOne(caseId, dto.actingEmployeeId)
    if (disciplinaryCase.employeeId !== dto.actingEmployeeId) {
      throw new ForbiddenException("Only the employee involved in this case can appeal it.")
    }
    if (!APPEALABLE_STATUSES.includes(disciplinaryCase.status)) {
      throw new BadRequestException("This case doesn't have a decision to appeal yet.")
    }

    const appeal = await this.prisma.appeal.create({
      data: { disciplinaryCaseId: caseId, employeeId: dto.actingEmployeeId, appealReason: dto.appealReason, supportingDocumentUrls: dto.supportingDocumentUrls ?? [] },
      include: APPEAL_INCLUDE,
    })

    await this.prisma.disciplinaryCase.update({ where: { id: caseId }, data: { status: "APPEALED" } })
    await this.log(caseId, "APPEAL_SUBMITTED", dto.actingEmployeeId)
    await this.notify(disciplinaryCase.reportedById, "ERC_APPEAL_SUBMITTED", "Appeal submitted", `An appeal has been submitted on case ${disciplinaryCase.caseNumber}.`, caseId, true)

    return appeal
  }

  async decide(caseId: string, appealId: string, dto: DecideAppealDto) {
    const scope = await this.accessService.resolveScope(dto.actingEmployeeId)
    if (!scope.allowAll) {
      throw new ForbiddenException("Only HR can decide an appeal.")
    }
    const disciplinaryCase = await this.casesService.findOne(caseId, dto.actingEmployeeId)
    const appeal = await this.findOne(caseId, appealId, dto.actingEmployeeId)
    if (appeal.status === "DECIDED") {
      throw new BadRequestException("This appeal has already been decided.")
    }

    const updated = await this.prisma.appeal.update({
      where: { id: appealId },
      data: { status: "DECIDED", outcome: dto.outcome, decisionComments: dto.decisionComments, decisionDate: new Date(), decidedById: dto.actingEmployeeId },
      include: APPEAL_INCLUDE,
    })

    await this.prisma.disciplinaryCase.update({ where: { id: caseId }, data: { status: "CLOSED", closedAt: new Date() } })
    await this.log(caseId, "APPEAL_DECIDED", dto.actingEmployeeId, `${dto.outcome}: ${dto.decisionComments}`)
    await this.notify(disciplinaryCase.employeeId, "ERC_APPEAL_DECIDED", "Appeal decision available", `A decision is available on your appeal for case ${disciplinaryCase.caseNumber}.`, caseId)

    return updated
  }

  private async notify(
    recipientEmployeeId: string,
    type: "ERC_APPEAL_SUBMITTED" | "ERC_APPEAL_DECIDED",
    title: string,
    message: string,
    caseId: string,
    forAdmin = false
  ) {
    await this.prisma.notification.create({
      data: {
        recipientEmployeeId,
        type,
        title,
        message,
        actionUrl: forAdmin ? `/admin/employee-relations/cases/${caseId}` : `/staff/employee-relations/cases/${caseId}`,
      },
    })
  }

  private async log(caseId: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.employeeRelationsAuditLog.create({ data: { entityType: "DisciplinaryCase", entityId: caseId, action, actorId, notes: notes || null } })
  }
}
