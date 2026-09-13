import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, StreamableFile } from "@nestjs/common"
import { LeaveRequestStatus } from "@prisma/client"

import { AdjustBalanceDto } from "../leave/leave-balances/dto/adjust-balance.dto"
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

  // --- Leave management ------------------------------------------------
  // Approve/reject and cancel deliberately have NO routes here — they go
  // straight through the existing generic POST /leave/requests/:id/decide
  // and /:id/cancel endpoints (LeaveRequestsService's own authorization is
  // now department-head-aware, see that service's assertCanDecideStep/
  // assertCanCancel), so the client's existing DecideRequestForm/
  // CancelRequestButton components work here unmodified.

  @Get(":departmentId/leave/calendar")
  getLeaveCalendar(
    @Param("departmentId") departmentId: string,
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("year") year: string,
    @Query("month") month: string
  ) {
    return this.departmentDashboardService.getLeaveCalendar(departmentId, actingEmployeeId, Number(year), Number(month))
  }

  @Get(":departmentId/leave/requests")
  getLeaveRequests(
    @Param("departmentId") departmentId: string,
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("status") status?: LeaveRequestStatus,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.departmentDashboardService.getLeaveRequests(departmentId, actingEmployeeId, {
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }

  @Get(":departmentId/leave/balances")
  getLeaveBalances(
    @Param("departmentId") departmentId: string,
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("year") year?: string
  ) {
    return this.departmentDashboardService.getLeaveBalances(departmentId, actingEmployeeId, year ? Number(year) : undefined)
  }

  @Patch(":departmentId/leave/balances/:employeeId/:leaveTypeId")
  adjustLeaveBalance(
    @Param("departmentId") departmentId: string,
    @Param("employeeId") employeeId: string,
    @Param("leaveTypeId", ParseUUIDPipe) leaveTypeId: string,
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("year") year: string,
    @Body() dto: AdjustBalanceDto
  ) {
    return this.departmentDashboardService.adjustLeaveBalance(departmentId, actingEmployeeId, employeeId, leaveTypeId, Number(year), dto)
  }

  // --- Performance -------------------------------------------------------

  @Get(":departmentId/performance")
  getEmployeePerformance(@Param("departmentId") departmentId: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.departmentDashboardService.getEmployeePerformance(departmentId, actingEmployeeId)
  }
}
