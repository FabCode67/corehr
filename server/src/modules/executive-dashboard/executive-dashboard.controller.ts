import { Controller, Get, Header, Query, StreamableFile } from "@nestjs/common"

import { ExecutiveDashboardPdfService } from "./executive-dashboard-pdf.service"
import { ExecutiveDashboardService } from "./executive-dashboard.service"

@Controller("executive-dashboard")
export class ExecutiveDashboardController {
  constructor(
    private readonly executiveDashboardService: ExecutiveDashboardService,
    private readonly executiveDashboardPdfService: ExecutiveDashboardPdfService
  ) {}

  @Get("overview")
  getOverview(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.executiveDashboardService.getOverview(actingEmployeeId)
  }

  @Get("pdf")
  @Header("Content-Type", "application/pdf")
  async downloadPdf(@Query("actingEmployeeId") actingEmployeeId: string) {
    const overview = await this.executiveDashboardService.getOverview(actingEmployeeId)
    const buffer = await this.executiveDashboardPdfService.generate(overview)
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="executive-dashboard-${new Date().toISOString().slice(0, 10)}.pdf"`,
    })
  }
}
