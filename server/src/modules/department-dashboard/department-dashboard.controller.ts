import { Body, Controller, Get, Param, Post, Query, StreamableFile } from "@nestjs/common"

import { CreateRequisitionDto } from "../recruitment/requisitions/dto/create-requisition.dto"

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

  @Get(":departmentId/employees")
  getEmployees(
    @Param("departmentId") departmentId: string,
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("search") search?: string,
    @Query("positionId") positionId?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.departmentDashboardService.getEmployees(departmentId, actingEmployeeId, {
      search,
      positionId,
      includeInactive: includeInactive === "true",
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }

  // Must stay above ":departmentId/employees/:employeeId" below — otherwise
  // Nest matches "export" as an employeeId (same reasoning as the
  // export/export-columns/line-managers routes in employees.controller.ts).
  @Get(":departmentId/employees/export")
  async exportEmployees(
    @Param("departmentId") departmentId: string,
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("columns") columns?: string,
    @Query("format") format?: string
  ) {
    const requestedKeys = (columns ?? "").split(",").map((key) => key.trim()).filter(Boolean)
    const { buffer, isCsv } = await this.departmentDashboardService.exportEmployees(departmentId, actingEmployeeId, {
      columns: requestedKeys,
      format,
    })

    return new StreamableFile(buffer, {
      type: isCsv ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="department-employees-${Date.now()}.${isCsv ? "csv" : "xlsx"}"`,
    })
  }

  @Get(":departmentId/employees/:employeeId")
  getEmployee(
    @Param("departmentId") departmentId: string,
    @Param("employeeId") employeeId: string,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.departmentDashboardService.getEmployee(departmentId, employeeId, actingEmployeeId)
  }

  @Get(":departmentId/positions")
  getPositions(@Param("departmentId") departmentId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.departmentDashboardService.getPositions(departmentId, actingEmployeeId)
  }

  @Get(":departmentId/learning-hours")
  getLearningHours(@Param("departmentId") departmentId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.departmentDashboardService.getLearningHours(departmentId, actingEmployeeId)
  }

  @Get(":departmentId/org-chart")
  getOrgChart(@Param("departmentId") departmentId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.departmentDashboardService.getOrgChart(departmentId, actingEmployeeId)
  }

  @Get(":departmentId/workforce-plans")
  getEligibleWorkforcePlans(@Param("departmentId") departmentId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.departmentDashboardService.getEligibleWorkforcePlans(departmentId, actingEmployeeId)
  }

  @Post(":departmentId/requisitions")
  createRequisition(
    @Param("departmentId") departmentId: string,
    @Body() dto: CreateRequisitionDto,
    @Query("actingEmployeeId") actingEmployeeId: string
  ) {
    return this.departmentDashboardService.createRequisition(departmentId, actingEmployeeId, dto)
  }
}
