import { Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import {
  CreateLeaveTypeDto,
  ReplaceApprovalStepsDto,
  UpdateLeaveTypeDto,
  UpsertCarryForwardRuleDto,
  UpsertEntitlementRuleDto,
} from "./dto/leave-type.dto"

const LEAVE_TYPE_INCLUDE = {
  entitlementRules: true,
  approvalSteps: { orderBy: { order: "asc" as const } },
  carryForwardRule: true,
}

/**
 * Everything about a LeaveType is HR-configurable: the type itself
 * (category, gender restriction, whether it eats into Annual Leave),
 * per-employee-category entitlements (Annual Leave's 21/18/28/0 table),
 * its approval workflow steps, and its carry-forward rule. Nothing here is
 * a code constant — see schema.prisma's Leave Management section header.
 */
@Injectable()
export class LeaveTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.leaveType.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: LEAVE_TYPE_INCLUDE,
      orderBy: { name: "asc" },
    })
  }

  async findOne(id: string) {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id },
      include: LEAVE_TYPE_INCLUDE,
    })
    if (!leaveType) {
      throw new NotFoundException(`Leave type ${id} not found`)
    }
    return leaveType
  }

  create(dto: CreateLeaveTypeDto) {
    return this.prisma.leaveType.create({ data: dto, include: LEAVE_TYPE_INCLUDE })
  }

  async update(id: string, dto: UpdateLeaveTypeDto) {
    await this.findOne(id)
    return this.prisma.leaveType.update({ where: { id }, data: dto, include: LEAVE_TYPE_INCLUDE })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.leaveType.update({
      where: { id },
      data: { isActive: false },
      include: LEAVE_TYPE_INCLUDE,
    })
  }

  async upsertEntitlementRule(leaveTypeId: string, dto: UpsertEntitlementRuleDto) {
    await this.findOne(leaveTypeId)
    await this.prisma.leaveEntitlementRule.upsert({
      where: {
        leaveTypeId_employeeCategory: { leaveTypeId, employeeCategory: dto.employeeCategory },
      },
      update: { days: dto.days },
      create: { leaveTypeId, employeeCategory: dto.employeeCategory, days: dto.days },
    })
    return this.findOne(leaveTypeId)
  }

  async removeEntitlementRule(leaveTypeId: string, employeeCategory: string) {
    await this.findOne(leaveTypeId)
    await this.prisma.leaveEntitlementRule.deleteMany({
      where: { leaveTypeId, employeeCategory: employeeCategory as never },
    })
    return this.findOne(leaveTypeId)
  }

  /** Replaces the whole ordered step list in one call — simpler for the
   *  admin UI than granular add/remove/reorder endpoints. */
  async replaceApprovalSteps(leaveTypeId: string, dto: ReplaceApprovalStepsDto) {
    await this.findOne(leaveTypeId)

    await this.prisma.$transaction(
      async (tx) => {
        await tx.leaveApprovalStep.deleteMany({ where: { leaveTypeId } })
        if (dto.steps.length > 0) {
          await tx.leaveApprovalStep.createMany({
            data: dto.steps.map((step) => ({ leaveTypeId, order: step.order, role: step.role })),
          })
        }
      },
      // Same pooled-Neon-latency reasoning as leave-requests.service.ts.
      { timeout: 15000, maxWait: 10000 }
    )

    return this.findOne(leaveTypeId)
  }

  async upsertCarryForwardRule(leaveTypeId: string, dto: UpsertCarryForwardRuleDto) {
    await this.findOne(leaveTypeId)
    await this.prisma.leaveCarryForwardRule.upsert({
      where: { leaveTypeId },
      update: dto,
      create: { leaveTypeId, ...dto },
    })
    return this.findOne(leaveTypeId)
  }
}
