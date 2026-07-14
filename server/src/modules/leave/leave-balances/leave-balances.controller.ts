import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AdjustBalanceDto } from "./dto/adjust-balance.dto"
import { LeaveBalancesService } from "./leave-balances.service"

@ApiTags("Leave / Balances")
@Controller("leave/balances")
export class LeaveBalancesController {
  constructor(private readonly leaveBalancesService: LeaveBalancesService) {}

  /** Admin-triggered: carries unused fromYear balances into toYear per each
   *  LeaveType's carry-forward rule. Defaults to "last year -> this year". */
  @Post("carry-forward")
  runCarryForward(@Query("fromYear") fromYear?: string, @Query("toYear") toYear?: string) {
    const currentYear = new Date().getFullYear()
    return this.leaveBalancesService.runCarryForward(
      fromYear ? Number(fromYear) : currentYear - 1,
      toYear ? Number(toYear) : currentYear
    )
  }

  @Get("employee/:employeeId")
  getSummary(@Param("employeeId", ParseUUIDPipe) employeeId: string, @Query("year") year?: string) {
    return this.leaveBalancesService.getSummary(employeeId, year ? Number(year) : undefined)
  }

  @Patch("employee/:employeeId/:leaveTypeId")
  adjust(
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Param("leaveTypeId", ParseUUIDPipe) leaveTypeId: string,
    @Query("year") year: string | undefined,
    @Body() dto: AdjustBalanceDto
  ) {
    return this.leaveBalancesService.adjust(
      employeeId,
      leaveTypeId,
      year ? Number(year) : new Date().getFullYear(),
      dto
    )
  }
}
