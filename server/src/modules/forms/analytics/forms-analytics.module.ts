import { Module } from "@nestjs/common"

import { FormsAccessModule } from "../access/forms-access.module"

import { FormsAnalyticsController } from "./forms-analytics.controller"
import { FormsAnalyticsService } from "./forms-analytics.service"

@Module({
  imports: [FormsAccessModule],
  controllers: [FormsAnalyticsController],
  providers: [FormsAnalyticsService],
  exports: [FormsAnalyticsService],
})
export class FormsAnalyticsModule {}
