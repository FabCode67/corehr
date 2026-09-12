import { Controller, Get, Param, Query } from "@nestjs/common"

import { DepartmentDashboardService } from "./department-dashboard.service"

@Controller("department-dashboard")
export class DepartmentDashboardController {
  constructor(private readonly departmentDashboardService: DepartmentDashboardService) {}

  @Get("my-departments")
  getMyDepartments(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.departmentDashboardService.getMyDepartments(actingEmployeeId)
  }

  @Get(":departmentId/summary")
  getSummary(@Param("departmentId") departmentId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.departmentDashboardService.getSummary(departmentId, actingEmployeeId)
  }
}
