import { Injectable } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { UpdateLeaveSettingsDto } from "./dto/leave-policy.dto"

/**
 * Bank-wide weekend/working-day configuration. Modelled as a singleton row
 * (id is always 1) rather than a code constant, per the spec's "weekend
 * definitions" and "working days" being HR-configurable.
 */
@Injectable()
export class LeaveSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.leaveSettings.findUnique({ where: { id: 1 } })
    if (existing) return existing

    return this.prisma.leaveSettings.create({
      data: { id: 1, weekendDays: [0, 6], excludeWeekends: true, excludePublicHolidays: true },
    })
  }

  async update(dto: UpdateLeaveSettingsDto) {
    await this.get() // ensures the row exists
    return this.prisma.leaveSettings.update({ where: { id: 1 }, data: dto })
  }
}
