import { Injectable } from "@nestjs/common"
import { NotificationType, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

/**
 * In-app notifications only, per the spec's current scope (Email/SMS/Teams
 * are explicitly listed as future work). Kept as a thin, generic "create +
 * list + mark read" service so any module can raise a notification without
 * depending on notification internals.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    params: {
      recipientEmployeeId: string
      type: NotificationType
      title: string
      message: string
      relatedLeaveRequestId?: string
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma
    return client.notification.create({ data: params })
  }

  findForEmployee(employeeId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { recipientEmployeeId: employeeId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } })
  }

  async markAllRead(employeeId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientEmployeeId: employeeId, isRead: false },
      data: { isRead: true },
    })
  }
}
