import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { HrAnalyticsAccessService } from "./access/hr-analytics-access.service"
import { HrAnalyticsAccessLogService } from "./hr-analytics-access-log.service"
import { HrAnalyticsDelegatedService } from "./hr-analytics-delegated.service"
import type { HrAnalyticsFilters } from "./hr-analytics-filters.util"
import { HrAnalyticsSavedViewsService } from "./hr-analytics-saved-views.service"
import { HrAnalyticsService } from "./hr-analytics.service"

type Query_ = Record<string, string | undefined>

/**
 * One controller for the whole dashboard — KPIs, charts (own + delegated),
 * saved views, and the overview aggregate used on initial page load. Kept
 * as a single file (unlike most domains' split controllers) since every
 * endpoint here shares the same filter-parsing/scoping logic and none of
 * them do writes beyond saved views and the access log.
 */
@ApiTags("HR Analytics")
@Controller("hr-analytics")
export class HrAnalyticsController {
  constructor(
    private readonly hrAnalyticsService: HrAnalyticsService,
    private readonly delegated: HrAnalyticsDelegatedService,
    private readonly accessService: HrAnalyticsAccessService,
    private readonly savedViewsService: HrAnalyticsSavedViewsService,
    private readonly accessLogService: HrAnalyticsAccessLogService
  ) {}

  /** Parses the query string into HrAnalyticsFilters and applies role
   *  scoping. For a non-admin actor with no explicit departmentId, defaults
   *  to the first department they head (see HrAnalyticsDelegatedService's
   *  doc comment for why this is a simplification, not full multi-
   *  department enforcement) — every direct-Employee query additionally
   *  gets the full scopeEmployeeIds/scopeDepartmentIds restriction via
   *  buildEmployeeDimensionWhere regardless of this default. */
  private async resolveFilters(query: Query_, actingEmployeeId: string): Promise<HrAnalyticsFilters> {
    const scope = await this.accessService.resolveScope(actingEmployeeId)

    const filters: HrAnalyticsFilters = {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      years: query.years ? query.years.split(",").map(Number).filter((n) => !Number.isNaN(n)) : undefined,
      year: query.year ? Number(query.year) : undefined,
      month: query.month ? Number(query.month) : undefined,
      quarter: query.quarter ? Number(query.quarter) : undefined,
      departmentId: query.departmentId,
      functionId: query.functionId,
      unitId: query.unitId,
      branchId: query.branchId,
      positionId: query.positionId,
      levelId: query.levelId,
      bandId: query.bandId,
      contractType: query.contractType,
      gender: query.gender,
      employmentStatus: query.employmentStatus,
      scopeAllowAll: scope.allowAll,
      scopeEmployeeIds: scope.employeeIds,
      scopeDepartmentIds: scope.departmentIds,
    }

    if (!scope.allowAll && !filters.departmentId && scope.departmentIds.length > 0) {
      filters.departmentId = scope.departmentIds[0]
    }

    return filters
  }

  // ==== KPI Cards ==========================================================

  @Get("kpis/total-staff")
  async totalStaff(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.totalStaff(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("kpis/average-age")
  async averageAge(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.averageAge(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("kpis/band-distribution")
  async bandDistribution(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.bandDistribution(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("kpis/attrition-rate")
  async attritionRate(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.attritionRate(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("kpis/position-fill-rate")
  async positionFillRate(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.positionFillRate(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("kpis/leave-utilization")
  async leaveUtilization(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.leaveUtilizationSummary(await this.resolveFilters(query, actingEmployeeId))
  }

  // ==== Charts — own =========================================================

  @Get("charts/employee-distribution-by-department")
  async employeeDistributionByDepartment(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.employeeDistributionByDepartment(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("charts/exit-summary")
  async exitSummary(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.exitSummary(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("charts/demographics")
  async demographics(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.employeeDemographics(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("charts/org-structure")
  async orgStructure(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.orgStructureAnalytics(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("charts/employee-experience")
  async employeeExperience(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.employeeExperienceAnalytics(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("charts/hiring-exit-trend")
  async hiringExitTrend(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.hrAnalyticsService.hiringExitTrend(await this.resolveFilters(query, actingEmployeeId))
  }

  // ==== Charts — delegated to existing per-module analytics services ===============

  @Get("charts/performance-distribution")
  async performanceDistribution(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.delegated.performanceDistribution(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("charts/performance-by-department")
  async performanceByDepartment(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.delegated.performanceByDepartment(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("charts/leave-summary")
  async leaveSummary(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.delegated.leaveSummary(await this.resolveFilters(query, actingEmployeeId))
  }

  @Get("charts/recruitment")
  async recruitment(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.delegated.recruitmentAnalyticsFor(actingEmployeeId)
  }

  @Get("charts/learning")
  async learning(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.delegated.learningAnalyticsFor(await this.resolveFilters(query, actingEmployeeId))
  }

  // ==== Overview (initial dashboard load — everything in one call, logged) =========

  @Get("overview")
  async overview(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    const filters = await this.resolveFilters(query, actingEmployeeId)

    const [totalStaff, averageAge, bandDistribution, attritionRate, positionFillRate, leaveUtilization, employeeDistribution] = await Promise.all([
      this.hrAnalyticsService.totalStaff(filters),
      this.hrAnalyticsService.averageAge(filters),
      this.hrAnalyticsService.bandDistribution(filters),
      this.hrAnalyticsService.attritionRate(filters),
      this.hrAnalyticsService.positionFillRate(filters),
      this.hrAnalyticsService.leaveUtilizationSummary(filters),
      this.hrAnalyticsService.employeeDistributionByDepartment(filters),
    ])

    void this.accessLogService.log(actingEmployeeId, "overview", query)

    return { totalStaff, averageAge, bandDistribution, attritionRate, positionFillRate, leaveUtilization, employeeDistribution }
  }

  // ==== Saved Views =========================================================

  @Get("saved-views")
  savedViews(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.savedViewsService.list(actingEmployeeId)
  }

  @Post("saved-views")
  saveSavedView(@Body() body: { actingEmployeeId: string; name: string; filters: Record<string, unknown> }) {
    return this.savedViewsService.save(body.actingEmployeeId, body.name, body.filters)
  }

  @Delete("saved-views/:id")
  removeSavedView(@Param("id") id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.savedViewsService.remove(id, actingEmployeeId)
  }
}
