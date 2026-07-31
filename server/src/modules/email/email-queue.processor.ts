import { Injectable, Logger } from "@nestjs/common"
import { Interval } from "@nestjs/schedule"

import { PrismaService } from "../../prisma/prisma.service"
import { MailerService } from "./mailer.service"

const BATCH_SIZE = 25
const POLL_INTERVAL_MS = 30_000

/**
 * The "Queue Processing → Send Email → Store Delivery Status" half of the
 * spec's pipeline. EmailService.enqueue() only ever writes a PENDING
 * EmailLog row (fast, safe to call from inside a request or a transaction);
 * this processor is what actually talks to SMTP, on its own timer, off any
 * request's critical path.
 *
 * DB-backed queue instead of Redis+BullMQ: see the doc comment on the
 * "Email Notification & Automation" section of schema.prisma for the full
 * reasoning. In short — this repo has no Redis/queue infra anywhere, and
 * @nestjs/schedule + Postgres gets the same Create Job → Queue → Send →
 * Store Status pipeline without adding an external service to operate.
 *
 * Backoff: retryCount 0→1 waits 2 min, 1→2 waits 4 min, 2→3 waits 8 min,
 * etc., capped by maxRetries (EmailLog.maxRetries, defaults to 3) before
 * the row is marked FAILED for good.
 */
@Injectable()
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name)
  private running = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async processQueue() {
    // Guards against a slow batch overlapping the next timer tick.
    if (this.running) return
    this.running = true
    try {
      await this.runBatch()
    } catch (error) {
      this.logger.error(`Unexpected error while processing email queue: ${(error as Error).message}`, (error as Error).stack)
    } finally {
      this.running = false
    }
  }

  private async runBatch() {
    const due = await this.prisma.emailLog.findMany({
      where: {
        status: { in: ["PENDING", "RETRYING"] },
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: { nextAttemptAt: "asc" },
      take: BATCH_SIZE,
    })

    if (due.length === 0) return

    if (!this.mailer.isConfigured) {
      // Don't burn retries against a transporter that will never work —
      // fail fast with a clear, actionable reason visible in Email History.
      await this.prisma.emailLog.updateMany({
        where: { id: { in: due.map((row) => row.id) } },
        data: {
          status: "FAILED",
          failureReason: "SMTP is not configured (MAIL_HOST/MAIL_USER/MAIL_PASSWORD missing). Set these environment variables to enable outgoing email.",
        },
      })
      return
    }

    for (const row of due) {
      try {
        await this.mailer.send({ to: row.recipientEmail, subject: row.subject, html: row.bodyHtml })
        await this.prisma.emailLog.update({
          where: { id: row.id },
          data: { status: "SENT", sentAt: new Date(), failureReason: null },
        })
      } catch (error) {
        const nextRetryCount = row.retryCount + 1
        const failureReason = (error as Error).message ?? "Unknown SMTP error"

        if (nextRetryCount >= row.maxRetries) {
          await this.prisma.emailLog.update({
            where: { id: row.id },
            data: { status: "FAILED", retryCount: nextRetryCount, failureReason },
          })
          this.logger.warn(`Email log ${row.id} (${row.templateKey} -> ${row.recipientEmail}) permanently failed after ${nextRetryCount} attempts: ${failureReason}`)
        } else {
          const backoffMinutes = 2 ** nextRetryCount
          await this.prisma.emailLog.update({
            where: { id: row.id },
            data: {
              status: "RETRYING",
              retryCount: nextRetryCount,
              failureReason,
              nextAttemptAt: new Date(Date.now() + backoffMinutes * 60_000),
            },
          })
        }
      }
    }
  }
}
