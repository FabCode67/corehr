import { Module } from "@nestjs/common"

import { ProfileAnalyticsController } from "./profile-analytics.controller"
import { ProfileAnalyticsService } from "./profile-analytics.service"

@Module({
  controllers: [ProfileAnalyticsController],
  providers: [ProfileAnalyticsService],
  exports: [ProfileAnalyticsService],
})
export class ProfileAnalyticsModule {}
