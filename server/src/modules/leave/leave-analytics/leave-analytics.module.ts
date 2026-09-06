import { Module } from "@nestjs/common"

import { LeaveAnalyticsController } from "./leave-analytics.controller"
import { LeaveAnalyticsService } from "./leave-analytics.service"
import { LeaveExportService } from "./leave-export.service"

@Module({
  controllers: [LeaveAnalyticsController],
  providers: [LeaveAnalyticsService, LeaveExportService],
  exports: [LeaveAnalyticsService],
})
export class LeaveAnalyticsModule {}
