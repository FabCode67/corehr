import { Module } from "@nestjs/common"

import { LearningAccessModule } from "../access/learning-access.module"

import { LearningAnalyticsController } from "./analytics.controller"
import { LearningAnalyticsService } from "./analytics.service"

@Module({
  imports: [LearningAccessModule],
  controllers: [LearningAnalyticsController],
  providers: [LearningAnalyticsService],
  exports: [LearningAnalyticsService],
})
export class LearningAnalyticsModule {}
