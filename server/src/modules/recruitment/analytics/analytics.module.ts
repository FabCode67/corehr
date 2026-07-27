import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { RecruitmentAnalyticsController } from "./analytics.controller"
import { RecruitmentAnalyticsService } from "./analytics.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [RecruitmentAnalyticsController],
  providers: [RecruitmentAnalyticsService],
  exports: [RecruitmentAnalyticsService],
})
export class RecruitmentAnalyticsModule {}
