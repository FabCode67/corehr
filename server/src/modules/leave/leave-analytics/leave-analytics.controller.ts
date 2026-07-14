import { Controller, Get, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AnalyticsFilters, LeaveAnalyticsService } from "./leave-analytics.service"

@ApiTags("Leave / Analytics")
@Controller("leave/analytics")
export class LeaveAnalyticsController {
  constructor(private readonly leaveAnalyticsService: LeaveAnalyticsService) {}

  private parseFilters(query: {
    departmentId?: string
    functionId?: string
    workLocation?: string
    employeeId?: string
    year?: string
  }): AnalyticsFilters {
    return {
      departmentId: query.departmentId,
      functionId: query.functionId,
      workLocation: query.workLocation,
      employeeId: query.employeeId,
      year: query.year ? Number(query.year) : undefined,
    }
  }

  @Get("utilization-by-department")
  utilizationByDepartment(
    @Query("departmentId") departmentId?: string,
    @Query("functionId") functionId?: string,
    @Query("workLocation") workLocation?: string,
    @Query("employeeId") employeeId?: string,
    @Query("year") year?: string
  ) {
    return this.leaveAnalyticsService.utilizationByDepartment(
      this.parseFilters({ departmentId, functionId, workLocation, employeeId, year })
    )
  }

  @Get("utilization-by-branch")
  utilizationByBranch(
    @Query("departmentId") departmentId?: string,
    @Query("functionId") functionId?: string,
    @Query("workLocation") workLocation?: string,
    @Query("employeeId") employeeId?: string,
    @Query("year") year?: string
  ) {
    return this.leaveAnalyticsService.utilizationByBranch(
      this.parseFilters({ departmentId, functionId, workLocation, employeeId, year })
    )
  }

  @Get("utilization-by-gender")
  utilizationByGender(
    @Query("departmentId") departmentId?: string,
    @Query("functionId") functionId?: string,
    @Query("workLocation") workLocation?: string,
    @Query("employeeId") employeeId?: string,
    @Query("year") year?: string
  ) {
    return this.leaveAnalyticsService.utilizationByGender(
      this.parseFilters({ departmentId, functionId, workLocation, employeeId, year })
    )
  }

  @Get("monthly-trends")
  monthlyTrends(
    @Query("departmentId") departmentId?: string,
    @Query("functionId") functionId?: string,
    @Query("workLocation") workLocation?: string,
    @Query("employeeId") employeeId?: string,
    @Query("year") year?: string
  ) {
    return this.leaveAnalyticsService.monthlyTrends(
      this.parseFilters({ departmentId, functionId, workLocation, employeeId, year })
    )
  }

  @Get("type-distribution")
  typeDistribution(
    @Query("departmentId") departmentId?: string,
    @Query("functionId") functionId?: string,
    @Query("workLocation") workLocation?: string,
    @Query("employeeId") employeeId?: string,
    @Query("year") year?: string
  ) {
    return this.leaveAnalyticsService.typeDistribution(
      this.parseFilters({ departmentId, functionId, workLocation, employeeId, year })
    )
  }

  @Get("balance-extremes")
  balanceExtremes(
    @Query("departmentId") departmentId?: string,
    @Query("functionId") functionId?: string,
    @Query("workLocation") workLocation?: string,
    @Query("employeeId") employeeId?: string,
    @Query("year") year?: string,
    @Query("limit") limit?: string
  ) {
    return this.leaveAnalyticsService.balanceExtremes(
      this.parseFilters({ departmentId, functionId, workLocation, employeeId, year }),
      limit ? Number(limit) : undefined
    )
  }

  @Get("upcoming-leave")
  upcomingLeave(
    @Query("departmentId") departmentId?: string,
    @Query("functionId") functionId?: string,
    @Query("workLocation") workLocation?: string,
    @Query("employeeId") employeeId?: string,
    @Query("year") year?: string,
    @Query("daysAhead") daysAhead?: string
  ) {
    return this.leaveAnalyticsService.upcomingLeave(
      this.parseFilters({ departmentId, functionId, workLocation, employeeId, year }),
      daysAhead ? Number(daysAhead) : undefined
    )
  }

  @Get("currently-on-leave")
  currentlyOnLeave(
    @Query("departmentId") departmentId?: string,
    @Query("functionId") functionId?: string,
    @Query("workLocation") workLocation?: string,
    @Query("employeeId") employeeId?: string,
    @Query("year") year?: string
  ) {
    return this.leaveAnalyticsService.currentlyOnLeave(
      this.parseFilters({ departmentId, functionId, workLocation, employeeId, year })
    )
  }
}
