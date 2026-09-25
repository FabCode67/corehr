import { Controller, ForbiddenException, Get, Query, StreamableFile } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { AnnualLeavePlanService } from "./annual-leave-plan.service"

/**
 * HR's bank-wide view of the Annual Leave Plan — every department's
 * uploaded plan, consolidated, exportable, and chartable. Every route here
 * is HR-admin-only (assertAdmin below); a Head of Department's own
 * upload/view/template routes live on DepartmentDashboardController
 * instead, scoped to their own department by
 * DepartmentDashboardService.assertAccess().
 */
@Controller("leave/annual-plan")
export class AnnualLeavePlanController {
  constructor(
    private readonly annualLeavePlanService: AnnualLeavePlanService,
    private readonly prisma: PrismaService
  ) {}

  private async assertAdmin(actingEmployeeId: string) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId }, select: { isAdmin: true } })
    if (!actor?.isAdmin) {
      throw new ForbiddenException("Only HR Administrators can view the bank-wide Annual Leave Plan.")
    }
  }

  @Get()
  async list(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("year") year: string,
    @Query("departmentId") departmentId?: string
  ) {
    await this.assertAdmin(actingEmployeeId)
    return this.annualLeavePlanService.getForDepartments(departmentId ? [departmentId] : undefined, Number(year))
  }

  @Get("export")
  async export(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("year") year: string,
    @Query("departmentId") departmentId?: string
  ) {
    await this.assertAdmin(actingEmployeeId)
    const buffer = await this.annualLeavePlanService.exportWorkbook(departmentId ? [departmentId] : undefined, Number(year))
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="annual-leave-plan-${year}.xlsx"`,
    })
  }

  @Get("analytics")
  async analytics(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("year") year: string,
    @Query("departmentId") departmentId?: string
  ) {
    await this.assertAdmin(actingEmployeeId)
    return this.annualLeavePlanService.analytics(departmentId ? [departmentId] : undefined, Number(year))
  }
}
