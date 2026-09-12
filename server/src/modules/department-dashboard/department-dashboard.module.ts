import { Module } from "@nestjs/common"

import { DepartmentDashboardController } from "./department-dashboard.controller"
import { DepartmentDashboardService } from "./department-dashboard.service"

@Module({
  controllers: [DepartmentDashboardController],
  providers: [DepartmentDashboardService],
  exports: [DepartmentDashboardService],
})
export class DepartmentDashboardModule {}
