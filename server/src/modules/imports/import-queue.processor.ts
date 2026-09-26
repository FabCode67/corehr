import { Injectable, Logger } from "@nestjs/common"
import { Interval } from "@nestjs/schedule"

import { PrismaService } from "../../prisma/prisma.service"

import { ImportsService } from "./imports.service"

const POLL_INTERVAL_MS = 10_000

/**
 * Runs the actual bulk-import row processing off the request thread — see
 * ImportsService.commit()'s doc comment. Same DB-backed-queue pattern as
 * EmailQueueProcessor (see that class for the full "why not Redis/BullMQ"
 * reasoning): commit() just flips the job's status to IMPORTING, and this
 * picks up whatever's sitting in that state on its own timer.
 *
 * Polled more frequently than the email queue (10s vs 30s) since a bulk
 * import is an interactive action a user is actively watching a progress
 * dialog for, not fire-and-forget background mail.
 */
@Injectable()
export class ImportQueueProcessor {
  private readonly logger = new Logger(ImportQueueProcessor.name)
  private running = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly importsService: ImportsService
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async processQueue() {
    // Guards against a slow job overlapping the next timer tick — same
    // single-flight convention as EmailQueueProcessor. One job at a time,
    // in creation order, since imports can be large and there's no benefit
    // to running two heavy row-by-row imports concurrently against the
    // same database on one instance.
    if (this.running) return
    this.running = true
    try {
      const next = await this.prisma.importJob.findFirst({
        where: { status: "IMPORTING" },
        orderBy: { startedAt: "asc" },
        select: { id: true },
      })
      if (!next) return

      await this.importsService.processJob(next.id)
    } catch (error) {
      this.logger.error(`Unexpected error while processing import job queue: ${(error as Error).message}`, (error as Error).stack)
    } finally {
      this.running = false
    }
  }
}
