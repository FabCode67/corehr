import { Module } from "@nestjs/common"

import { AnalyticsController } from "./analytics.controller"
import { PerformanceAnalyticsService } from "./analytics.service"

@Module({
  controllers: [AnalyticsController],
  providers: [PerformanceAnalyticsService],
  exports: [PerformanceAnalyticsService],
})
export class PerformanceAnalyticsModule {}
