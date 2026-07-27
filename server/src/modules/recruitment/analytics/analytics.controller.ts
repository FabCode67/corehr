import { Controller, Get, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { RecruitmentAnalyticsService } from "./analytics.service"

@ApiTags("Recruitment / Analytics")
@Controller("recruitment/analytics")
export class RecruitmentAnalyticsController {
  constructor(private readonly analyticsService: RecruitmentAnalyticsService) {}

  @Get("overview")
  getOverview(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getOverview(actingEmployeeId)
  }

  @Get("funnel")
  getFunnel(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getFunnel(actingEmployeeId)
  }

  @Get("status-distribution")
  getStatusDistribution(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getStatusDistribution(actingEmployeeId)
  }

  @Get("offer-stats")
  getOfferStats(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getOfferStats(actingEmployeeId)
  }

  @Get("time-to-hire")
  getTimeToHire(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getTimeToHire(actingEmployeeId)
  }

  @Get("vacancies-by-department")
  getVacanciesByDepartment(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getVacanciesByDepartment(actingEmployeeId)
  }

  @Get("vacancies-by-branch")
  getVacanciesByBranch(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getVacanciesByBranch(actingEmployeeId)
  }

  @Get("budget-by-department")
  getBudgetByDepartment(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.getBudgetByDepartment(actingEmployeeId)
  }
}
