import { Controller, Get, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { OrgChartService } from "./org-chart.service"

@ApiTags("Organization / Org Chart")
@Controller("organization/org-chart")
export class OrgChartController {
  constructor(private readonly orgChartService: OrgChartService) {}

  @Get()
  getTree(@Query("rootPositionId") rootPositionId?: string) {
    return this.orgChartService.getTree(rootPositionId)
  }
}
