import { Injectable, Logger } from "@nestjs/common"
import type { Prisma, PrismaClient } from "@prisma/client"

import { PrismaService } from "../../prisma/prisma.service"

/** Maps an EmailTemplate.category to the NotificationPreference boolean
 *  field that gates it. A category with no entry here (e.g. "onboarding",
 *  which is always sent via an isMandatory template anyway) is never
 *  blocked by preferences. */
const CATEGORY_TO_PREFERENCE_FIELD: Record<string, "leaveEmails" | "performanceEmails" | "learningEmails" | "recruitmentEmails" | "exitEmails" | "approvalEmails"> = {
  leave: "leaveEmails",
  performance: "performanceEmails",
  learning: "learningEmails",
  recruitment: "recruitmentEmails",
  exit: "exitEmails",
  approval: "approvalEmails",
}

export interface EnqueueEmailParams {
  templateKey: string
  recipientEmail: string
  /** Omit for recipients with no Employee row (e.g. recruitment candidates) — preference checks and the Email History employee link are simply skipped. */
  recipientEmployeeId?: string
  variables: Record<string, string | number | undefined | null>
  relatedModule?: string
  relatedEntityId?: string
}

/**
 * The single entry point every module should call to send an HR email —
 * mirrors NotificationsService's create(params, tx?) shape so it's a
 * drop-in alongside the in-app notification calls already scattered across
 * Leave/Learning/Forms/Exit/Recruitment. This method itself only ever does
 * a fast DB insert (render the template, write a PENDING EmailLog row) —
 * the actual SMTP call happens later, off the caller's critical path, in
 * EmailQueueProcessor. This matters a lot for call sites inside an existing
 * `$transaction` with a tight timeout (several already exist in this
 * codebase because of Neon cold-start latency) — a synchronous SMTP round
 * trip in the middle of one of those would make an existing timeout risk
 * worse, so enqueue() deliberately never sends anything itself.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  constructor(private readonly prisma: PrismaService) {}

  private render(text: string, variables: EnqueueEmailParams["variables"]): string {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
      const value = variables[key]
      return value === undefined || value === null ? "" : String(value)
    })
  }

  async enqueue(params: EnqueueEmailParams, tx?: Prisma.TransactionClient) {
    const client: PrismaClient | Prisma.TransactionClient = tx ?? this.prisma

    const template = await client.emailTemplate.findUnique({ where: { key: params.templateKey } })
    if (!template) {
      // A missing/renamed template should never break the real business
      // action that triggered it (e.g. approving leave) — log and move on.
      this.logger.warn(`No email template registered for key "${params.templateKey}" — skipping.`)
      return null
    }
    if (!template.isActive) {
      return null
    }

    if (!template.isMandatory && params.recipientEmployeeId) {
      const allowed = await this.isAllowed(client, params.recipientEmployeeId, template.category)
      if (!allowed) return null
    }

    const subject = this.render(template.subject, params.variables)
    const bodyHtml = this.render(template.bodyHtml, params.variables)

    return client.emailLog.create({
      data: {
        templateKey: params.templateKey,
        recipientEmail: params.recipientEmail,
        recipientEmployeeId: params.recipientEmployeeId,
        subject,
        bodyHtml,
        variables: params.variables as Prisma.InputJsonValue,
        relatedModule: params.relatedModule,
        relatedEntityId: params.relatedEntityId,
        status: "PENDING",
        nextAttemptAt: new Date(),
      },
    })
  }

  private async isAllowed(client: PrismaClient | Prisma.TransactionClient, employeeId: string, category: string): Promise<boolean> {
    const preference = await client.notificationPreference.findUnique({ where: { employeeId } })
    if (!preference) return true // no row yet — defaults are all-enabled
    if (!preference.emailEnabled) return false

    const field = CATEGORY_TO_PREFERENCE_FIELD[category]
    if (!field) return true
    return preference[field] !== false
  }
}
