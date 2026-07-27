import { Controller, Get, Param, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { LearningAnalyticsService, type LearningAnalyticsFilters } from "./analytics.service"

@ApiTags("Learning / Analytics")
@Controller("learning/analytics")
export class LearningAnalyticsController {
  constructor(private readonly analyticsService: LearningAnalyticsService) {}

  private parseFilters(query: Record<string, string | undefined>): LearningAnalyticsFilters {
    return {
      categoryId: query.categoryId,
      institutionId: query.institutionId,
      departmentId: query.departmentId,
      branchId: query.branchId,
      functionId: query.functionId,
      positionId: query.positionId,
      levelId: query.levelId,
      bandId: query.bandId,
      contractType: query.contractType,
      isMandatory: query.isMandatory === "true" ? true : query.isMandatory === "false" ? false : undefined,
      employeeId: query.employeeId,
    }
  }

  @Get("overview")
  overview(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.overview(this.parseFilters(query))
  }

  @Get("progress")
  progress(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.progressBreakdown(this.parseFilters(query))
  }

  @Get("compliance/by-department")
  complianceByDepartment(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.mandatoryComplianceByDepartment(this.parseFilters(query))
  }

  @Get("compliance/by-branch")
  complianceByBranch(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.mandatoryComplianceByBranch(this.parseFilters(query))
  }

  @Get("compliance/by-function")
  complianceByFunction(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.mandatoryComplianceByFunction(this.parseFilters(query))
  }

  @Get("compliance/by-position")
  complianceByPosition(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.mandatoryComplianceByPosition(this.parseFilters(query))
  }

  @Get("compliance/by-band")
  complianceByBand(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.mandatoryComplianceByBand(this.parseFilters(query))
  }

  @Get("department-analysis")
  departmentAnalysis(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.departmentAnalysis(this.parseFilters(query))
  }

  @Get("function-analysis")
  functionAnalysis(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.functionAnalysis(this.parseFilters(query))
  }

  @Get("institution-analysis")
  institutionAnalysis(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.institutionAnalysis(this.parseFilters(query))
  }

  @Get("cost-analysis")
  costAnalysis(@Query() query: Record<string, string | undefined>) {
    return this.analyticsService.costAnalysis(this.parseFilters(query))
  }

  @Get("employee-profile/:employeeId")
  employeeProfile(@Param("employeeId") employeeId: string) {
    return this.analyticsService.employeeProfile(employeeId)
  }

  @Get("my-overdue-mandatory")
  myOverdueMandatory(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.myOverdueMandatory(actingEmployeeId)
  }

  @Get("team-overdue-mandatory")
  teamOverdueMandatory(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.analyticsService.teamOverdueMandatory(actingEmployeeId)
  }
}
