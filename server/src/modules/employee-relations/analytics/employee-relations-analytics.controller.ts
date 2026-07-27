import { Controller, Get, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { EmployeeRelationsAnalyticsService } from "./employee-relations-analytics.service"

@ApiTags("Employee Relations / Analytics")
@Controller("employee-relations/analytics")
export class EmployeeRelationsAnalyticsController {
  constructor(private readonly analyticsService: EmployeeRelationsAnalyticsService) {}

  @Get("overview")
  getOverview(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getOverview(actingEmployeeId)
  }

  @Get("cases-by-status")
  getCasesByStatus(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getCasesByStatus(actingEmployeeId)
  }

  @Get("cases-by-category")
  getCasesByCategory(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getCasesByCategory(actingEmployeeId)
  }

  @Get("cases-by-department")
  getCasesByDepartment(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getCasesByDepartment(actingEmployeeId)
  }

  @Get("cases-by-branch")
  getCasesByBranch(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getCasesByBranch(actingEmployeeId)
  }

  @Get("monthly-case-trend")
  getMonthlyCaseTrend(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getMonthlyCaseTrend(actingEmployeeId)
  }

  @Get("annual-case-trend")
  getAnnualCaseTrend(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getAnnualCaseTrend(actingEmployeeId)
  }

  @Get("sanctions-by-type")
  getSanctionsByType(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getSanctionsByType(actingEmployeeId)
  }

  @Get("sanctions-by-year")
  getSanctionsByYear(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getSanctionsByYear(actingEmployeeId)
  }

  @Get("sanction-trend-by-type")
  getSanctionTrendByType(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getSanctionTrendByType(actingEmployeeId)
  }

  @Get("sanctions-by-department")
  getSanctionsByDepartment(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getSanctionsByDepartment(actingEmployeeId)
  }

  @Get("sanctions-by-branch")
  getSanctionsByBranch(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getSanctionsByBranch(actingEmployeeId)
  }

  @Get("sanctions-by-function")
  getSanctionsByFunction(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getSanctionsByFunction(actingEmployeeId)
  }

  @Get("sanctions-by-level")
  getSanctionsByLevel(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getSanctionsByLevel(actingEmployeeId)
  }

  @Get("sanctions-by-band")
  getSanctionsByBand(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getSanctionsByBand(actingEmployeeId)
  }

  @Get("investigation-stats")
  getInvestigationStats(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getInvestigationStats(actingEmployeeId)
  }

  @Get("appeal-stats")
  getAppealStats(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getAppealStats(actingEmployeeId)
  }
}
