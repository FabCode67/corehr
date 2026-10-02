import { Controller, Get, Header, Query, StreamableFile } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { EdwhReportService } from "./edwh-report.service"

/** Defaults to the current calendar month (YYYYMM) when the caller omits
 *  it — mirrors every other report/export endpoint in this app, which
 *  degrades to a sensible default rather than 400ing on a missing filter. */
function resolveYearMonth(yearMonth?: string): string {
  if (yearMonth && /^\d{6}$/.test(yearMonth)) return yearMonth
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
}

@ApiTags("EDWH Report")
@Controller("edwh-report")
export class EdwhReportController {
  constructor(private readonly reportService: EdwhReportService) {}

  @Get("export")
  @Header("Content-Type", "text/csv")
  async export(@Query("yearMonth") yearMonthParam?: string) {
    const yearMonth = resolveYearMonth(yearMonthParam)
    const buffer = await this.reportService.generateCsv(yearMonth)
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="edwh-report-${yearMonth}.csv"`,
    })
  }
}
