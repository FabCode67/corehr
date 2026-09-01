import { Controller, Get, Header, Query, StreamableFile } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { HrAnalyticsAccessService } from "./access/hr-analytics-access.service"
import { HrAnalyticsAccessLogService } from "./hr-analytics-access-log.service"
import type { HrAnalyticsFilters } from "./hr-analytics-filters.util"
import { HrAnalyticsExportService, REPORT_SECTIONS, type CustomReportSectionInput } from "./hr-analytics-export.service"

type Query_ = Record<string, string | undefined>

@ApiTags("HR Analytics / Export")
@Controller("hr-analytics/export")
export class HrAnalyticsExportController {
  constructor(
    private readonly exportService: HrAnalyticsExportService,
    private readonly accessService: HrAnalyticsAccessService,
    private readonly accessLogService: HrAnalyticsAccessLogService
  ) {}

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

  @Get("xlsx")
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  async exportXlsx(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    const filters = await this.resolveFilters(query, actingEmployeeId)
    const buffer = await this.exportService.generateExcel(filters, actingEmployeeId)
    void this.accessLogService.log(actingEmployeeId, "export-xlsx", query)
    return new StreamableFile(buffer, { disposition: `attachment; filename="hr-analytics-${Date.now()}.xlsx"` })
  }

  @Get("csv")
  @Header("Content-Type", "text/csv")
  async exportCsv(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    const filters = await this.resolveFilters(query, actingEmployeeId)
    const csv = await this.exportService.generateCsv(filters, actingEmployeeId)
    void this.accessLogService.log(actingEmployeeId, "export-csv", query)
    return new StreamableFile(Buffer.from(csv, "utf-8"), { disposition: `attachment; filename="hr-analytics-${Date.now()}.csv"` })
  }

  @Get("pdf")
  @Header("Content-Type", "application/pdf")
  async exportPdf(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    const filters = await this.resolveFilters(query, actingEmployeeId)
    const buffer = await this.exportService.generatePdf(filters, actingEmployeeId)
    void this.accessLogService.log(actingEmployeeId, "export-pdf", query)
    return new StreamableFile(buffer, { disposition: `attachment; filename="hr-analytics-${Date.now()}.pdf"` })
  }

  @Get("pptx")
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
  async exportPptx(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    const filters = await this.resolveFilters(query, actingEmployeeId)
    const buffer = await this.exportService.generatePptx(filters, actingEmployeeId)
    void this.accessLogService.log(actingEmployeeId, "export-pptx", query)
    return new StreamableFile(buffer, { disposition: `attachment; filename="hr-analytics-${Date.now()}.pptx"` })
  }

  // ==== Custom Report Builder ================================================
  // See REPORT_SECTIONS in hr-analytics-export.service.ts for the section
  // catalog this is built around.

  @Get("custom/sections")
  listCustomReportSections() {
    return REPORT_SECTIONS
  }

  /** `sections` is a JSON-encoded array of `{ key, dateFrom?, dateTo? }` —
   *  passed as a single query param (rather than repeated `sections[]=...`
   *  entries) since each selected section carries its own optional date
   *  range alongside its key. Malformed/missing input degrades to an empty
   *  report (every section unchecked) rather than a 400 — consistent with
   *  this controller's other export routes, which likewise don't hard-fail
   *  on a bad filter value. */
  @Get("custom")
  async exportCustom(@Query() query: Query_, @Query("actingEmployeeId") actingEmployeeId: string) {
    const filters = await this.resolveFilters(query, actingEmployeeId)
    const format: "xlsx" | "pptx" = query.format === "pptx" ? "pptx" : "xlsx"

    let sections: CustomReportSectionInput[] = []
    try {
      const parsed: unknown = query.sections ? JSON.parse(query.sections) : []
      if (Array.isArray(parsed)) {
        sections = parsed.filter((s): s is CustomReportSectionInput => !!s && typeof s === "object" && typeof (s as { key?: unknown }).key === "string")
      }
    } catch {
      sections = []
    }

    const buffer = await this.exportService.generateCustomReport(sections, filters, format, actingEmployeeId)
    void this.accessLogService.log(actingEmployeeId, `export-custom-${format}`, query)

    const contentType =
      format === "pptx" ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return new StreamableFile(buffer, { type: contentType, disposition: `attachment; filename="custom-hr-report-${Date.now()}.${format}"` })
  }
}
