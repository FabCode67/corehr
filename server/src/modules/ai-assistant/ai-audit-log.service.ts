import { Injectable } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { PrismaService } from "../../prisma/prisma.service"

export type AiAuditEventType =
  | "CHAT_MESSAGE"
  | "TOOL_CALL"
  | "REPORT_GENERATED"
  | "ACTION_PROPOSED"
  | "ACTION_CONFIRMED"
  | "ACTION_EXECUTED"
  | "ACTION_REJECTED"
  | "ACTION_FAILED"
  | "ACCESS_DENIED"

/**
 * "Every AI interaction must be logged for traceability and compliance with
 * internal banking policies" — one flat table, one row per event, kept
 * deliberately separate from AiMessage (see schema.prisma's module comment)
 * so a compliance reviewer can filter/scan events without reconstructing
 * intent from conversation JSON. Fire-and-forget (`void log(...)`) from
 * every call site, same pattern as HrAnalyticsAccessLogService — logging
 * failures should never block the user's chat response.
 */
@Injectable()
export class AiAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(employeeId: string, eventType: AiAuditEventType, detail: unknown, conversationId?: string) {
    try {
      await this.prisma.aiAuditLog.create({
        data: { employeeId, eventType, detail: detail as Prisma.InputJsonValue, conversationId },
      })
    } catch {
      // Never let audit logging break the assistant itself.
    }
  }

  async list(params: { employeeId?: string; eventType?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1
    const pageSize = Math.min(params.pageSize ?? 50, 200)
    const where = {
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
      ...(params.eventType ? { eventType: params.eventType } : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.aiAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      }),
      this.prisma.aiAuditLog.count({ where }),
    ])
    return { rows, total, page, pageSize }
  }
}
