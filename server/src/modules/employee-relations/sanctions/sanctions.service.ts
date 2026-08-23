import { BadRequestException, Injectable } from "@nestjs/common"

import { DisciplinaryCasesService } from "../cases/disciplinary-cases.service"
import { EmployeeRelationsAccessService } from "../access/employee-relations-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { CreateSanctionDto } from "./dto/create-sanction.dto"

const SANCTION_INCLUDE = {
  sanctionType: true,
  issuedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  approvalAuthority: { select: { employeeNumber: true, firstName: true, lastName: true } },
} as const

/**
 * A sanction is always issued against a PENDING_DECISION case — creating
 * one advances the case to SANCTION_ISSUED. employeeId is denormalized
 * from the case onto the sanction itself so an employee's permanent
 * sanction history (a named spec requirement) is a direct query, not a
 * join through cases — see schema module doc comment.
 */
@Injectable()
export class SanctionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casesService: DisciplinaryCasesService,
    private readonly accessService: EmployeeRelationsAccessService
  ) {}

  async create(caseId: string, dto: CreateSanctionDto) {
    const disciplinaryCase = await this.casesService.findOne(caseId, dto.actingEmployeeId)
    if (disciplinaryCase.status !== "PENDING_DECISION") {
      throw new BadRequestException("A sanction can only be issued once the case is Pending Decision.")
    }

    const sanction = await this.prisma.sanction.create({
      data: {
        disciplinaryCaseId: caseId,
        employeeId: disciplinaryCase.employeeId,
        sanctionTypeId: dto.sanctionTypeId,
        dateOfSanction: dto.dateOfSanction ?? new Date(),
        reason: dto.reason,
        effectiveDate: dto.effectiveDate,
        issuedById: dto.issuedById,
        approvalAuthorityId: dto.approvalAuthorityId,
        comments: dto.comments,
        supportingDocumentUrls: dto.supportingDocumentUrls ?? [],
      },
      include: SANCTION_INCLUDE,
    })

    await this.prisma.disciplinaryCase.update({ where: { id: caseId }, data: { status: "SANCTION_ISSUED" } })
    await this.log(caseId, "SANCTION_ISSUED", dto.actingEmployeeId, `${sanction.sanctionType.name}`)
    await this.notify(disciplinaryCase.employeeId, "ERC_DECISION_ISSUED", "Disciplinary decision issued", `A decision has been issued on case ${disciplinaryCase.caseNumber}.`, caseId)

    return sanction
  }

  async findForCase(caseId: string, actingEmployeeId: string) {
    await this.casesService.findOne(caseId, actingEmployeeId)
    return this.prisma.sanction.findMany({ where: { disciplinaryCaseId: caseId }, include: SANCTION_INCLUDE, orderBy: { dateOfSanction: "desc" } })
  }

  /** Permanent sanction history for one employee, independent of case
   *  access — HR/Executive see everything, a line manager sees only their
   *  direct reports' sanctions, everyone else only their own. */
  async findForEmployee(employeeId: string, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    if (!scope.allowAll && employeeId !== actingEmployeeId && !scope.directReportIds.has(employeeId)) {
      return []
    }
    return this.prisma.sanction.findMany({ where: { employeeId }, include: SANCTION_INCLUDE, orderBy: { dateOfSanction: "desc" } })
  }

  private async notify(recipientEmployeeId: string, type: "ERC_DECISION_ISSUED", title: string, message: string, caseId: string) {
    await this.prisma.notification.create({
      data: { recipientEmployeeId, type, title, message, actionUrl: `/staff/employee-relations/cases/${caseId}` },
    })
  }

  private async log(caseId: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.employeeRelationsAuditLog.create({ data: { entityType: "DisciplinaryCase", entityId: caseId, action, actorId, notes: notes || null } })
  }
}
