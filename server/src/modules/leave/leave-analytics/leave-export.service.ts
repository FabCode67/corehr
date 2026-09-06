import { Injectable } from "@nestjs/common"
import * as XLSX from "xlsx"

import { buildCsv } from "../../imports/spreadsheet.util"

import { AnalyticsFilters, LeaveAnalyticsService } from "./leave-analytics.service"

// Mirrors client/lib/api/leave.ts's MONTH_NAMES exactly (not imported — the
// two apps don't share code) so an exported "Monthly Trend" sheet uses the
// same month labels the Leave Analytics page itself shows.
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/**
 * Turns the Leave Analytics page (utilization by department/branch/gender,
 * monthly trend, type distribution, balance extremes, currently-on-leave,
 * upcoming leave) into a downloadable file — same "compute once, render to
 * every format" shape as EmployeesExportService, just section-based instead
 * of column-based since this report has no per-row column picker.
 */
@Injectable()
export class LeaveExportService {
  constructor(private readonly leaveAnalyticsService: LeaveAnalyticsService) {}

  private async buildSections(filters: AnalyticsFilters) {
    const [byDepartment, byBranch, byGender, monthly, byType, balanceExtremes, currentlyOnLeave, upcomingLeave] = await Promise.all([
      this.leaveAnalyticsService.utilizationByDepartment(filters),
      this.leaveAnalyticsService.utilizationByBranch(filters),
      this.leaveAnalyticsService.utilizationByGender(filters),
      this.leaveAnalyticsService.monthlyTrends(filters),
      this.leaveAnalyticsService.typeDistribution(filters),
      this.leaveAnalyticsService.balanceExtremes(filters, 10),
      this.leaveAnalyticsService.currentlyOnLeave(filters),
      this.leaveAnalyticsService.upcomingLeave(filters, 30),
    ])

    return { byDepartment, byBranch, byGender, monthly, byType, balanceExtremes, currentlyOnLeave, upcomingLeave }
  }

  async generateXlsx(filters: AnalyticsFilters): Promise<Buffer> {
    const data = await this.buildSections(filters)
    const workbook = XLSX.utils.book_new()

    const addSheet = (name: string, headerRow: string[], rows: (string | number)[][]) => {
      const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...rows])
      sheet["!cols"] = headerRow.map((header) => ({ wch: Math.max(header.length + 2, 16) }))
      XLSX.utils.book_append_sheet(workbook, sheet, name)
    }

    addSheet(
      "Utilization by Dept",
      ["Department", "Days Taken", "Requests"],
      data.byDepartment.map((row) => [row.departmentName, row.days, row.requests])
    )
    addSheet(
      "Utilization by Branch",
      ["Branch", "Days Taken", "Requests"],
      data.byBranch.map((row) => [row.branchName, row.days, row.requests])
    )
    addSheet(
      "Utilization by Gender",
      ["Gender", "Days Taken", "Requests"],
      data.byGender.map((row) => [row.gender, row.days, row.requests])
    )
    addSheet(
      "Monthly Trend",
      ["Month", "Days Taken", "Requests"],
      data.monthly.map((row) => [MONTH_NAMES[row.month - 1], row.days, row.requests])
    )
    addSheet(
      "Leave Type Distribution",
      ["Leave Type", "Days Taken", "Requests"],
      data.byType.map((row) => [row.leaveTypeName, row.days, row.requests])
    )
    addSheet(
      "Highest Balances",
      ["Employee Number", "Employee Name", "Leave Type", "Remaining Days"],
      data.balanceExtremes.highest.map((row) => [row.employeeId, row.employeeName, row.leaveTypeName, row.remainingDays])
    )
    addSheet(
      "Lowest Balances",
      ["Employee Number", "Employee Name", "Leave Type", "Remaining Days"],
      data.balanceExtremes.lowest.map((row) => [row.employeeId, row.employeeName, row.leaveTypeName, row.remainingDays])
    )
    addSheet(
      "Currently On Leave",
      ["Employee Number", "Employee Name", "Department", "Position", "Leave Type", "Start Date", "End Date"],
      data.currentlyOnLeave.map((row) => [
        row.employee.employeeNumber,
        `${row.employee.firstName} ${row.employee.lastName}`,
        row.employee.position?.department.name ?? "",
        row.employee.position?.title ?? "",
        row.leaveType.name,
        row.startDate.toISOString().slice(0, 10),
        row.endDate.toISOString().slice(0, 10),
      ])
    )
    addSheet(
      "Upcoming Leave (30 days)",
      ["Employee Number", "Employee Name", "Leave Type", "Start Date", "End Date"],
      data.upcomingLeave.map((row) => [
        row.employee.employeeNumber,
        `${row.employee.firstName} ${row.employee.lastName}`,
        row.leaveType.name,
        row.startDate.toISOString().slice(0, 10),
        row.endDate.toISOString().slice(0, 10),
      ])
    )

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
  }

  /** One combined CSV — XLSX (above) is the richer, multi-sheet format;
   *  this is the flat single-file fallback for tools that only take CSV.
   *  Sections are stacked with a title line and a blank line between them
   *  (readable when opened as text; a spreadsheet app importing it just
   *  sees a slightly ragged single sheet, same trade-off as any
   *  multi-section CSV). */
  async generateCsv(filters: AnalyticsFilters): Promise<Buffer> {
    const data = await this.buildSections(filters)
    const blocks: Buffer[] = []

    const addBlock = (title: string, headerRow: string[], rows: (string | number)[][]) => {
      const titleBuffer = Buffer.from(`${title}\n`, "utf-8")
      blocks.push(titleBuffer, buildCsv(headerRow, rows), Buffer.from("\n\n", "utf-8"))
    }

    addBlock("Utilization by Department", ["Department", "Days Taken", "Requests"], data.byDepartment.map((row) => [row.departmentName, row.days, row.requests]))
    addBlock("Utilization by Branch", ["Branch", "Days Taken", "Requests"], data.byBranch.map((row) => [row.branchName, row.days, row.requests]))
    addBlock("Utilization by Gender", ["Gender", "Days Taken", "Requests"], data.byGender.map((row) => [row.gender, row.days, row.requests]))
    addBlock("Monthly Trend", ["Month", "Days Taken", "Requests"], data.monthly.map((row) => [MONTH_NAMES[row.month - 1], row.days, row.requests]))
    addBlock("Leave Type Distribution", ["Leave Type", "Days Taken", "Requests"], data.byType.map((row) => [row.leaveTypeName, row.days, row.requests]))
    addBlock(
      "Highest Balances",
      ["Employee Number", "Employee Name", "Leave Type", "Remaining Days"],
      data.balanceExtremes.highest.map((row) => [row.employeeId, row.employeeName, row.leaveTypeName, row.remainingDays])
    )
    addBlock(
      "Lowest Balances",
      ["Employee Number", "Employee Name", "Leave Type", "Remaining Days"],
      data.balanceExtremes.lowest.map((row) => [row.employeeId, row.employeeName, row.leaveTypeName, row.remainingDays])
    )
    addBlock(
      "Currently On Leave",
      ["Employee Number", "Employee Name", "Department", "Position", "Leave Type", "Start Date", "End Date"],
      data.currentlyOnLeave.map((row) => [
        row.employee.employeeNumber,
        `${row.employee.firstName} ${row.employee.lastName}`,
        row.employee.position?.department.name ?? "",
        row.employee.position?.title ?? "",
        row.leaveType.name,
        row.startDate.toISOString().slice(0, 10),
        row.endDate.toISOString().slice(0, 10),
      ])
    )
    addBlock(
      "Upcoming Leave (30 days)",
      ["Employee Number", "Employee Name", "Leave Type", "Start Date", "End Date"],
      data.upcomingLeave.map((row) => [
        row.employee.employeeNumber,
        `${row.employee.firstName} ${row.employee.lastName}`,
        row.leaveType.name,
        row.startDate.toISOString().slice(0, 10),
        row.endDate.toISOString().slice(0, 10),
      ])
    )

    return Buffer.concat(blocks)
  }
}
