import { Injectable } from "@nestjs/common"
import { NotificationType, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

/**
 * In-app notifications only, per the spec's current scope (Email/SMS/Teams
 * are explicitly listed as future work). Kept as a thin, generic "create +
 * list + mark read" service so any module can raise a notification without
 * depending on notification internals. Despite living under leave/, this is
 * the shared bank-wide notification helper — Learning already imports it
 * cross-module the same way; Forms/Employee Relations instead hit
 * `prisma.notification` directly, an equally valid alternative given
 * Notification has no module-specific relation besides
 * relatedLeaveRequestId. New modules can pick whichever is more convenient.
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
      /** Generic "this notification is about employee X" reference — for
       *  everything other than leave (which already has relatedLeaveRequestId).
       *  Lets the client deep-link an admin-facing notification straight to
       *  the employee record it concerns (e.g. probation/contract ending
       *  soon), instead of only ever landing on a generic list page. */
      relatedEmployeeId?: string
      /** Relative app path to the specific record this notification is
       *  about (e.g. "/staff/forms/abc123") — see the field's doc comment
       *  on the Notification model. Callers should pass this whenever the
       *  entity in question has a dedicated detail page; the client falls
       *  back to a generic type-based route otherwise. */
      actionUrl?: string
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma
    return client.notification.create({ data: params })
  }

  /** Broadcasts one notification to every HR Administrator (Employee.isAdmin)
   *  — used wherever the spec says "HR should be notified" without naming a
   *  specific individual (e.g. leave cancellation, onboarding document
   *  uploads awaiting review). No role/group concept exists on Notification
   *  itself, so this just fans out a create() per admin. */
  async createForAllAdmins(
    params: {
      type: NotificationType
      title: string
      message: string
      relatedLeaveRequestId?: string
      relatedEmployeeId?: string
      actionUrl?: string
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma
    const admins = await client.employee.findMany({ where: { isAdmin: true, isActive: true }, select: { employeeNumber: true } })
    if (admins.length === 0) return []
    return client.notification.createMany({
      data: admins.map((admin) => ({ recipientEmployeeId: admin.employeeNumber, ...params })),
    })
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
