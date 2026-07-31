import { Injectable } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { HrAnalyticsAccessService } from "../../hr-analytics/access/hr-analytics-access.service"
import { EmployeesService } from "../../employees/employees.service"

import type { AiToolDefinition, ToolContext } from "./types"
import { textResult } from "./types"

/** Same scope shape every *AccessService in this app produces — reused here
 *  (via HrAnalyticsAccessService, the broadest of the bunch: it already
 *  covers "workforce-wide" visibility) so employee search/lookup can never
 *  surface a person outside what the acting employee's existing dashboards
 *  would already show them. */
async function scopedEmployeeWhere(hrAccess: HrAnalyticsAccessService, actingEmployeeId: string): Promise<Prisma.EmployeeWhereInput> {
  const scope = await hrAccess.resolveScope(actingEmployeeId)
  if (scope.allowAll) return {}
  const or: Prisma.EmployeeWhereInput[] = [
    { employeeNumber: { in: scope.employeeIds } },
    ...(scope.departmentIds.length ? [{ position: { departmentId: { in: scope.departmentIds } } }] : []),
  ]
  return { OR: or }
}

@Injectable()
export class EmployeeToolsProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeesService: EmployeesService,
    private readonly hrAccess: HrAnalyticsAccessService
  ) {}

  getTools(): AiToolDefinition[] {
    return [
      {
        name: "search_employees",
        description:
          "Search for employees by (partial, case-insensitive) name, and/or filter by department name. Returns employee number, full name, job title, department, and employment status. Use this to resolve a person's name to their employee number before calling get_employee_profile or an action tool that needs an employeeIdentifier.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Full or partial name to search for." },
            departmentName: { type: "string", description: "Restrict results to this department (partial match)." },
            limit: { type: "number", description: "Max results to return, default 10." },
          },
        },
        handler: async (input, ctx) => {
          const name = typeof input.name === "string" ? input.name.trim() : undefined
          const departmentName = typeof input.departmentName === "string" ? input.departmentName.trim() : undefined
          const limit = typeof input.limit === "number" ? Math.min(input.limit, 25) : 10

          const scopeWhere = await scopedEmployeeWhere(this.hrAccess, ctx.actingEmployeeId)
          const where: Prisma.EmployeeWhereInput = {
            AND: [
              scopeWhere,
              name
                ? { OR: [{ firstName: { contains: name, mode: "insensitive" } }, { lastName: { contains: name, mode: "insensitive" } }] }
                : {},
              departmentName ? { position: { department: { name: { contains: departmentName, mode: "insensitive" } } } } : {},
            ],
          }

          const employees = await this.prisma.employee.findMany({
            where,
            take: limit,
            select: {
              employeeNumber: true,
              firstName: true,
              lastName: true,
              employmentStatus: true,
              position: { select: { title: true, department: { select: { name: true } } } },
            },
            orderBy: { firstName: "asc" },
          })

          return textResult(
            employees.map((e) => ({
              employeeNumber: e.employeeNumber,
              name: `${e.firstName} ${e.lastName}`,
              jobTitle: e.position?.title ?? null,
              department: e.position?.department?.name ?? null,
              employmentStatus: e.employmentStatus,
            }))
          )
        },
      },
      {
        name: "get_employee_profile",
        description: "Get a single employee's profile: name, job title, department, branch, employment status, and reporting manager. Requires an exact employee number (use search_employees first if you only have a name).",
        inputSchema: {
          type: "object",
          properties: { employeeNumber: { type: "string", description: "Exact employee number, e.g. EMP-0001." } },
          required: ["employeeNumber"],
        },
        handler: async (input, ctx) => {
          const employeeNumber = String(input.employeeNumber ?? "")
          const scopeWhere = await scopedEmployeeWhere(this.hrAccess, ctx.actingEmployeeId)
          const visible = await this.prisma.employee.findFirst({ where: { AND: [scopeWhere, { employeeNumber }] }, select: { employeeNumber: true } })
          if (!visible) {
            return textResult({ error: `Employee ${employeeNumber} was not found, or is outside your access scope.` })
          }
          const [employee, manager] = await Promise.all([
            this.employeesService.findOne(employeeNumber),
            this.employeesService.getReportingManager(employeeNumber).catch(() => null),
          ])
          return textResult({
            employeeNumber: employee.employeeNumber,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
            jobTitle: employee.position?.title ?? null,
            department: employee.position?.department?.name ?? null,
            band: employee.band?.name ?? null,
            branch: employee.branch?.name ?? null,
            employmentStatus: employee.employmentStatus,
            reportingManager: manager,
          })
        },
      },
    ]
  }
}
