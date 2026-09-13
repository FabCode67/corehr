import { Module } from "@nestjs/common"

import { EmployeesModule } from "../employees/employees.module"
import { OrgChartModule } from "../organization/org-chart/org-chart.module"
import { RequisitionsModule } from "../recruitment/requisitions/requisitions.module"

import { DepartmentDashboardController } from "./department-dashboard.controller"
import { DepartmentDashboardService } from "./department-dashboard.service"

@Module({
  imports: [EmployeesModule, OrgChartModule, RequisitionsModule],
  controllers: [DepartmentDashboardController],
  providers: [DepartmentDashboardService],
  exports: [DepartmentDashboardService],
})
export class DepartmentDashboardModule {}
