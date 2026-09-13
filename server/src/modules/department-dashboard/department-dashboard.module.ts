import { Module } from "@nestjs/common"

import { EmployeesModule } from "../employees/employees.module"
import { LeaveBalancesModule } from "../leave/leave-balances/leave-balances.module"
import { LeaveRequestsModule } from "../leave/leave-requests/leave-requests.module"
import { OrgChartModule } from "../organization/org-chart/org-chart.module"
import { RequisitionsModule } from "../recruitment/requisitions/requisitions.module"

import { DepartmentDashboardController } from "./department-dashboard.controller"
import { DepartmentDashboardService } from "./department-dashboard.service"

@Module({
  imports: [EmployeesModule, OrgChartModule, RequisitionsModule, LeaveRequestsModule, LeaveBalancesModule],
  controllers: [DepartmentDashboardController],
  providers: [DepartmentDashboardService],
  exports: [DepartmentDashboardService],
})
export class DepartmentDashboardModule {}
