import { Injectable } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto"

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the employee's preference row, creating an all-enabled default
   *  one on first access — mirrors EmailService.isAllowed()'s "no row yet
   *  means everything's on" default, just made durable so the settings
   *  page has something to render toggles against immediately. */
  async findOrCreate(employeeId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { employeeId } })
    if (existing) return existing
    return this.prisma.notificationPreference.create({ data: { employeeId } })
  }

  async update(employeeId: string, dto: UpdateNotificationPreferenceDto) {
    await this.findOrCreate(employeeId)
    return this.prisma.notificationPreference.update({
      where: { employeeId },
      data: dto,
    })
  }
}
