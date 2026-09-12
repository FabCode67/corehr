import { Injectable, Logger } from "@nestjs/common"
import type { EmailTemplate, Prisma, PrismaClient } from "@prisma/client"

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

/** Variables merged into EVERY template's render, on top of whatever the
 *  caller passed — for values every single email needs regardless of
 *  which module sent it (currently just the footer's HR contact phone),
 *  so callers never have to remember to pass them individually. A
 *  caller-supplied variable of the same name still wins (see
 *  EmailService.enqueue() below), though no caller does that today. */
function buildGlobalVariables(): Record<string, string> {
  return {
    hr_contact_phone: process.env.HR_CONTACT_PHONE ?? "+250 780 503 242",
  }
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

    // Caller-supplied variables win over the global defaults on a name
    // collision — see buildGlobalVariables()'s doc comment.
    const variables = { ...buildGlobalVariables(), ...params.variables }
    const subject = this.render(template.subject, variables)
    const bodyHtml = this.render(template.bodyHtml, variables)

    const primary = await this.enqueueForRecipient(
      client,
      template,
      params,
      params.recipientEmail,
      params.recipientEmployeeId,
      subject,
      bodyHtml,
      variables
    )

    // HR runs the admin portal, and every HR Administrator is expected to
    // stay on top of everything happening bank-wide — so every email this
    // method sends also gets copied to every active HR Administrator
    // (Employee.isAdmin), not just the emails a module already addressed to
    // HR directly. Mirrors NotificationsService.create()'s identical
    // fan-out for in-app notifications — see that method's doc comment.
    // Each admin's own NotificationPreference still gates their copy
    // independently (via enqueueForRecipient's isAllowed check below), so
    // an admin who has muted a category (e.g. learningEmails) doesn't get
    // flooded by it just because this fan-out exists. Skips the primary
    // recipient if they're themselves an admin, so they don't get the same
    // email twice.
    const admins = await client.employee.findMany({
      where: {
        isAdmin: true,
        isActive: true,
        ...(params.recipientEmployeeId ? { employeeNumber: { not: params.recipientEmployeeId } } : {}),
      },
      select: { employeeNumber: true, email: true },
    })
    for (const admin of admins) {
      await this.enqueueForRecipient(client, template, params, admin.email, admin.employeeNumber, subject, bodyHtml, variables)
    }

    return primary
  }

  /** Renders + writes one PENDING EmailLog row for one recipient — shared by
   *  enqueue()'s primary recipient and its HR-admin fan-out above, so both
   *  paths apply the exact same mandatory/preference gating instead of the
   *  admin copies silently bypassing it. */
  private async enqueueForRecipient(
    client: PrismaClient | Prisma.TransactionClient,
    template: EmailTemplate,
    params: EnqueueEmailParams,
    recipientEmail: string,
    recipientEmployeeId: string | undefined,
    subject: string,
    bodyHtml: string,
    variables: EnqueueEmailParams["variables"]
  ) {
    if (!template.isMandatory && recipientEmployeeId) {
      const allowed = await this.isAllowed(client, recipientEmployeeId, template.category)
      if (!allowed) return null
    }

    return client.emailLog.create({
      data: {
        templateKey: params.templateKey,
        recipientEmail,
        recipientEmployeeId,
        subject,
        bodyHtml,
        variables: variables as Prisma.InputJsonValue,
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
