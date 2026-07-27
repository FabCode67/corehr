import { Controller, Get, Param, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { PerformanceReviewType } from "@prisma/client"

import { PerformanceAnalyticsService, type PerformanceAnalyticsFilters } from "./analytics.service"

@ApiTags("Performance / Analytics")
@Controller("performance/analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: PerformanceAnalyticsService) {}

  private parseFilters(query: Record<string, string | undefined>): PerformanceAnalyticsFilters {
    return {
      periodId: query.periodId,
      year: query.year ? Number(query.year) : undefined,
      reviewType: query.reviewType as PerformanceReviewType | undefined,
      departmentId: query.departmentId,
      unitId: query.unitId,
      branchId: query.branchId,
      positionId: query.positionId,
      levelId: query.levelId,
      bandId: query.bandId,
      contractType: query.contractType,
      gender: query.gender,
      employeeId: query.employeeId,
    }
  }

  @Get("distribution")
  distribution(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.distribution(this.parseFilters(query))
  }

  @Get("by-department")
  byDepartment(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.byDepartment(this.parseFilters(query))
  }

  @Get("by-unit")
  byUnit(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.byUnit(this.parseFilters(query))
  }

  @Get("by-branch")
  byBranch(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.byBranch(this.parseFilters(query))
  }

  @Get("by-position-level")
  byPositionLevel(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.byPositionLevel(this.parseFilters(query))
  }

  @Get("by-band")
  byBand(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.byBand(this.parseFilters(query))
  }

  @Get("by-gender")
  byGender(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.byGender(this.parseFilters(query))
  }

  @Get("by-contract-type")
  byContractType(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.byContractType(this.parseFilters(query))
  }

  @Get("trends")
  trends(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.trends(this.parseFilters(query))
  }

  @Get("progression/:employeeId")
  progression(@Param("employeeId") employeeId: string) {
    return this.analyticsService.employeeProgression(employeeId)
  }

  @Get("top-performers")
  topPerformers(@Query() query: Record<string, string | undefined>, @Query("limit") limit?: string) {
    return this.analyticsService.topPerformers(this.parseFilters(query), limit ? Number(limit) : undefined)
  }

  @Get("needs-improvement")
  needsImprovement(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.needsImprovement(this.parseFilters(query))
  }
}
