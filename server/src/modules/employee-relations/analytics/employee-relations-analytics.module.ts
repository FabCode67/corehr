import { Module } from "@nestjs/common"

import { EmployeeRelationsAccessModule } from "../access/employee-relations-access.module"

import { EmployeeRelationsAnalyticsController } from "./employee-relations-analytics.controller"
import { EmployeeRelationsAnalyticsService } from "./employee-relations-analytics.service"

@Module({
  imports: [EmployeeRelationsAccessModule],
  controllers: [EmployeeRelationsAnalyticsController],
  providers: [EmployeeRelationsAnalyticsService],
  exports: [EmployeeRelationsAnalyticsService],
})
export class EmployeeRelationsAnalyticsModule {}
