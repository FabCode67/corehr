import { Controller, Get, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { FormsAnalyticsService } from "./forms-analytics.service"

@ApiTags("Forms / Analytics")
@Controller("forms/analytics")
export class FormsAnalyticsController {
  constructor(private readonly analyticsService: FormsAnalyticsService) {}

  @Get("overview")
  getOverview(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getOverview(actingEmployeeId)
  }

  @Get("status-distribution")
  getStatusDistribution(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getStatusDistribution(actingEmployeeId)
  }

  @Get("completion-stats")
  getCompletionStats(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getCompletionStats(actingEmployeeId)
  }

  @Get("pending-signatures-by-role")
  getPendingSignaturesByRole(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getPendingSignaturesByRole(actingEmployeeId)
  }

  @Get("department-comparison")
  getDepartmentComparison(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getDepartmentComparison(actingEmployeeId)
  }

  @Get("compliance-by-category")
  getComplianceByCategory(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getComplianceByCategory(actingEmployeeId)
  }
}
