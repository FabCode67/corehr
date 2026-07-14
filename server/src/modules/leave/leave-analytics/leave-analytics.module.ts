import { Module } from "@nestjs/common"

import { LeaveAnalyticsController } from "./leave-analytics.controller"
import { LeaveAnalyticsService } from "./leave-analytics.service"

@Module({
  controllers: [LeaveAnalyticsController],
  providers: [LeaveAnalyticsService],
  exports: [LeaveAnalyticsService],
})
export class LeaveAnalyticsModule {}
