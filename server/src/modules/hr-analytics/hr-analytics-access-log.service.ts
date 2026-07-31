import { Injectable, Logger } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { PrismaService } from "../../prisma/prisma.service"

/** "All dashboard access should be logged for auditing" — one row per
 *  dashboard load / export, not per individual chart request (see
 *  HrAnalyticsAccessLog's schema doc comment). Failures are swallowed and
 *  logged rather than failing the request — an audit-log write should never
 *  be the reason a dashboard fails to load. */
@Injectable()
export class HrAnalyticsAccessLogService {
  private readonly logger = new Logger(HrAnalyticsAccessLogService.name)

  constructor(private readonly prisma: PrismaService) {}

  async log(employeeId: string, section: string, filters?: Record<string, unknown>) {
    try {
      await this.prisma.hrAnalyticsAccessLog.create({ data: { employeeId, section, filters: (filters ?? {}) as Prisma.InputJsonValue } })
    } catch (error) {
      this.logger.warn(`Failed to write HR Analytics access log for ${employeeId}/${section}: ${(error as Error).message}`)
    }
  }
}
