import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { LeaveRequestStatus, WorkLocation } from "@prisma/client"

import { CreateLeaveRequestDto, DecideApprovalDto, PreviewLeaveDaysDto } from "./dto/leave-request.dto"
import { LeaveRequestsService } from "./leave-requests.service"

@ApiTags("Leave / Requests")
@Controller("leave/requests")
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Get()
  findAll(
    @Query("employeeId") employeeId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("workLocation") workLocation?: WorkLocation,
    @Query("status") status?: LeaveRequestStatus,
    @Query("leaveTypeId") leaveTypeId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.leaveRequestsService.findAll({
      employeeId,
      departmentId,
      workLocation,
      status,
      leaveTypeId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    })
  }

  @Get("calendar")
  getCalendarData(
    @Query("year") year: string,
    @Query("month") month: string,
    @Query("departmentId") departmentId?: string,
    @Query("workLocation") workLocation?: WorkLocation
  ) {
    return this.leaveRequestsService.getCalendarData(Number(year), Number(month), {
      departmentId,
      workLocation,
    })
  }

  @Get("pending-for-manager/:employeeId")
  findPendingForManager(@Param("employeeId", ParseUUIDPipe) employeeId: string) {
    return this.leaveRequestsService.findPendingForManager(employeeId)
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.leaveRequestsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateLeaveRequestDto) {
    return this.leaveRequestsService.create(dto)
  }

  @Post("preview")
  previewDays(@Body() dto: PreviewLeaveDaysDto) {
    return this.leaveRequestsService.previewDays(dto.startDate, dto.endDate)
  }

  @Post(":id/decide")
  decide(@Param("id", ParseUUIDPipe) id: string, @Body() dto: DecideApprovalDto) {
    return this.leaveRequestsService.decide(id, dto)
  }

  @Post(":id/cancel")
  cancel(@Param("id", ParseUUIDPipe) id: string) {
    return this.leaveRequestsService.cancel(id)
  }
}
