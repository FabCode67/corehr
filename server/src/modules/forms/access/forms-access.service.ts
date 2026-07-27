import { Injectable, NotFoundException } from "@nestjs/common"

import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

export interface FormsAccessScope {
  /** HR Administrator — no restriction, sees every form/instance/template. */
  allowAll: boolean
  actingEmployeeId: string
}

/**
 * Resolves who an acting employee is allowed to see/act on for Forms
 * Management. Unlike Recruitment/Learning/Performance, form visibility
 * isn't department-based — it's purely "is this your form, did you assign
 * it, or are you (now or historically) one of its signers" — so this
 * service is deliberately much simpler than the other modules' access
 * services (no org-chart department-head derivation needed here).
 */
@Injectable()
export class FormsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(actingEmployeeId: string): Promise<FormsAccessScope> {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId } })
    if (!actor) {
      throw new NotFoundException(`Employee ${actingEmployeeId} not found`)
    }
    return { allowAll: actor.isAdmin, actingEmployeeId }
  }

  buildInstanceWhere(scope: FormsAccessScope): Prisma.FormInstanceWhereInput {
    if (scope.allowAll) return {}
    return {
      OR: [
        { employeeId: scope.actingEmployeeId },
        { assignedById: scope.actingEmployeeId },
        { signatures: { some: { signerId: scope.actingEmployeeId } } },
      ],
    }
  }

  canAccessInstance(
    scope: FormsAccessScope,
    instance: { employeeId: string; assignedById: string },
    isSigner: boolean
  ) {
    if (scope.allowAll) return true
    return instance.employeeId === scope.actingEmployeeId || instance.assignedById === scope.actingEmployeeId || isSigner
  }
}
