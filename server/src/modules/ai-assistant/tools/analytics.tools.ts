import { Injectable } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"
import { HrAnalyticsAccessService } from "../../hr-analytics/access/hr-analytics-access.service"
import { HrAnalyticsDelegatedService } from "../../hr-analytics/hr-analytics-delegated.service"
import type { HrAnalyticsFilters } from "../../hr-analytics/hr-analytics-filters.util"
import { HrAnalyticsService } from "../../hr-analytics/hr-analytics.service"
import { EmployeeRelationsAccessService } from "../../employee-relations/access/employee-relations-access.service"
import { EmployeeRelationsAnalyticsService } from "../../employee-relations/analytics/employee-relations-analytics.service"

import type { AiToolDefinition, ChartArtifact, ToolContext } from "./types"
import { textResult } from "./types"

/** Basic {name,value}[] -> chart-artifact adapter used by most tools below,
 *  matching the shape the HR Analytics dashboard's own chart components
 *  already consume (see client/app/admin/hr-analytics/charts.tsx). */
function barChart(title: string, rows: Array<{ name: string; value: number }>): ChartArtifact {
  return { type: "bar", title, data: rows, nameKey: "name", dataKey: "value" }
}

/**
 * Read-only analytics tools — one per existing HR Analytics / Employee
 * Relations analytics method, filtered by the SAME *AccessService role
 * scope every dashboard in this app already enforces. A non-admin actor
 * gets exactly the slice of data their existing dashboard access would
 * show them; nothing here widens what a given tool call can see.
 */
@Injectable()
export class AnalyticsToolsProvider {
  constructor(
    private readonly hrAnalytics: HrAnalyticsService,
    private readonly delegated: HrAnalyticsDelegatedService,
    private readonly hrAccess: HrAnalyticsAccessService,
    private readonly erAnalytics: EmployeeRelationsAnalyticsService,
    private readonly erAccess: EmployeeRelationsAccessService,
    private readonly prisma: PrismaService
  ) {}

  /** Same filter-resolution the HrAnalyticsController does per-request:
   *  role scope + optional department/year narrowing, resolved fresh for
   *  every tool call (cheap — one Employee lookup) rather than threaded
   *  through the whole conversation, so a change in the actor's org
   *  position always reflects immediately. */
  private async resolveFilters(input: Record<string, unknown>, ctx: ToolContext): Promise<HrAnalyticsFilters> {
    const scope = await this.hrAccess.resolveScope(ctx.actingEmployeeId)
    let departmentId = typeof input.departmentId === "string" ? input.departmentId : undefined

    if (!departmentId && typeof input.departmentName === "string") {
      const match = await this.prisma.department.findFirst({
        where: { name: { contains: input.departmentName, mode: "insensitive" } },
      })
      departmentId = match?.id
    }

    const filters: HrAnalyticsFilters = {
      year: typeof input.year === "number" ? input.year : undefined,
      departmentId,
      scopeAllowAll: scope.allowAll,
      scopeEmployeeIds: scope.employeeIds,
      scopeDepartmentIds: scope.departmentIds,
    }
    if (!scope.allowAll && !filters.departmentId && scope.departmentIds.length > 0) {
      filters.departmentId = scope.departmentIds[0]
    }
    return filters
  }

  getTools(): AiToolDefinition[] {
    const deptParam = {
      departmentId: { type: "string", description: "Department UUID, if already known." },
      departmentName: { type: "string", description: "Department name to filter by (looked up automatically) — prefer this over departmentId unless you already have the UUID." },
      year: { type: "number", description: "Calendar year to filter by, e.g. 2026." },
    }

    return [
      {
        name: "get_workforce_kpis",
        description:
          "Get the core workforce KPIs: total active staff, new joiners/exits, average age, band distribution, attrition rate (with breakdowns), position fill rate, and leave utilization. This is the best first call for any general 'how is headcount/workforce doing' question.",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => {
          const filters = await this.resolveFilters(input, ctx)
          const [totalStaff, averageAge, bandDistribution, attritionRate, positionFillRate, leaveUtilization] = await Promise.all([
            this.hrAnalytics.totalStaff(filters),
            this.hrAnalytics.averageAge(filters),
            this.hrAnalytics.bandDistribution(filters),
            this.hrAnalytics.attritionRate(filters),
            this.hrAnalytics.positionFillRate(filters),
            this.hrAnalytics.leaveUtilizationSummary(filters),
          ])
          return {
            forModel: { totalStaff, averageAge, bandDistribution, attritionRate, positionFillRate, leaveUtilization },
            chart: barChart(
              "Band distribution",
              bandDistribution.map((b: { bandName: string; count: number }) => ({ name: b.bandName, value: b.count }))
            ),
          }
        },
      },
      {
        name: "get_employee_distribution_by_department",
        description: "Get headcount distribution across departments (count and percent of total active staff per department).",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => {
          const rows = await this.hrAnalytics.employeeDistributionByDepartment(await this.resolveFilters(input, ctx))
          return { forModel: rows, chart: barChart("Headcount by department", rows.map((r: { departmentName: string; count: number }) => ({ name: r.departmentName, value: r.count }))) }
        },
      },
      {
        name: "get_exit_summary",
        description: "Get exit/attrition details: total exits and breakdowns by reason, type, department, branch, contract type, and yearly trend.",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => textResult(await this.hrAnalytics.exitSummary(await this.resolveFilters(input, ctx))),
      },
      {
        name: "get_employee_demographics",
        description: "Get workforce demographics: age histogram, gender distribution, and contract-type distribution.",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => textResult(await this.hrAnalytics.employeeDemographics(await this.resolveFilters(input, ctx))),
      },
      {
        name: "get_org_structure_analytics",
        description: "Get organizational structure analytics: headcount by function/department/unit, managers vs individual contributors, and span of control.",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => textResult(await this.hrAnalytics.orgStructureAnalytics(await this.resolveFilters(input, ctx))),
      },
      {
        name: "get_employee_experience_analytics",
        description: "Get tenure/experience analytics: average tenure, average banking experience, longest-serving and newest employees, and employees approaching retirement.",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => textResult(await this.hrAnalytics.employeeExperienceAnalytics(await this.resolveFilters(input, ctx))),
      },
      {
        name: "get_performance_distribution",
        description: "Get the distribution of employees across performance rating bands (e.g. Exceeds/Meets/Below Expectations), actual vs expected percentages.",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => {
          const rows = await this.delegated.performanceDistribution(await this.resolveFilters(input, ctx))
          return { forModel: rows, chart: barChart("Performance distribution", rows.map((r: { label: string; count: number }) => ({ name: r.label, value: r.count }))) }
        },
      },
      {
        name: "get_leave_summary",
        description: "Get leave analytics: days taken by department and leave type, monthly trend, and a month-by-leave-type utilization breakdown.",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => textResult(await this.delegated.leaveSummary(await this.resolveFilters(input, ctx))),
      },
      {
        name: "get_recruitment_analytics",
        description: "Get recruitment/hiring analytics: open requisitions, active applications, interviews this week, pending offers, hiring funnel, time-to-hire, and vacancies by department. Scope is fixed to the caller's own recruitment visibility (no department filter).",
        inputSchema: { type: "object", properties: {} },
        handler: async (_input, ctx) => textResult(await this.delegated.recruitmentAnalyticsFor(ctx.actingEmployeeId)),
      },
      {
        name: "get_learning_analytics",
        description: "Get learning & development analytics: training completion rate, mandatory-training compliance by department/function/branch/band, AML completion rate, and training cost/hours by department.",
        inputSchema: { type: "object", properties: deptParam },
        handler: async (input, ctx) => textResult(await this.delegated.learningAnalyticsFor(await this.resolveFilters(input, ctx))),
      },
      {
        name: "get_employee_relations_overview",
        description: "Get employee relations analytics: open/closed disciplinary case counts, cases by category/department/branch, sanctions by type, and investigation/appeal stats.",
        inputSchema: { type: "object", properties: {} },
        handler: async (_input, ctx) => {
          await this.erAccess.resolveScope(ctx.actingEmployeeId) // throws if actor unknown, same guard the ER dashboard uses
          const [overview, byCategory, byDepartment] = await Promise.all([
            this.erAnalytics.getOverview(ctx.actingEmployeeId),
            this.erAnalytics.getCasesByCategory(ctx.actingEmployeeId),
            this.erAnalytics.getCasesByDepartment(ctx.actingEmployeeId),
          ])
          return { forModel: { overview, byCategory, byDepartment } }
        },
      },
      {
        // Deliberately not scope-filtered: department/function names are
        // org-chart structural info, not employee data, and are already
        // shown unscoped to any authenticated actor via the HR Analytics
        // filter bar's own fetchDepartments() (client/lib/api/departments.ts)
        // — this tool exposes nothing that dashboard already didn't.
        name: "list_departments",
        description: "List all departments with their id and name — use this to resolve a department name to an id before calling an administrative action tool (e.g. propose_create_position), or when the user asks 'what departments do we have'.",
        inputSchema: { type: "object", properties: {} },
        handler: async () => {
          const departments = await this.prisma.department.findMany({
            where: { isActive: true },
            select: { id: true, name: true, function: { select: { name: true } } },
            orderBy: { name: "asc" },
          })
          return textResult(departments.map((d: { id: string; name: string; function: { name: string } | null }) => ({ id: d.id, name: d.name, function: d.function?.name ?? null })))
        },
      },
    ]
  }
}
