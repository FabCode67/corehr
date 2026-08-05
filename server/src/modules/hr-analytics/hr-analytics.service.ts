import { Injectable } from "@nestjs/common"

import { PrismaService } from "../../prisma/prisma.service"

import { buildEmployeeDimensionWhere, resolveDateRange, type HrAnalyticsFilters } from "./hr-analytics-filters.util"

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25

function ageInYears(dateOfBirth: Date, at: Date = new Date()): number {
  return (at.getTime() - dateOfBirth.getTime()) / MS_PER_YEAR
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * KPI cards and the charts that have no existing analytics service to
 * delegate to (Exit Summary, Employee Demographics, Org Structure,
 * Employee Experience, Band Distribution, Position Fill Rate, Employee
 * Distribution by Department). See HrAnalyticsDelegatedService for the
 * sections that reuse Leave/Performance/Recruitment/Learning's existing
 * analytics services instead.
 *
 * "Total Approved Positions" is read as: every active Position row IS an
 * approved organizational seat (this schema has no separate headcount-
 * planning concept for an already-created Position — WorkforcePlan is
 * future/requested headcount, a different thing). "Filled" = has at least
 * one ACTIVE employee currently assigned to it.
 */
@Injectable()
export class HrAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==== KPI Cards ================================================================

  /** Total Staff Count: active headcount + joiners/exits during the filtered period.
   *  "Compared to previous year" uses filters.year when given (so a user
   *  looking at 2024 sees 2024-vs-2023), otherwise the current calendar year. */
  async totalStaff(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const { from, to } = resolveDateRange(filters)
    const referenceYear = filters.year ?? new Date().getFullYear()
    const asOfLastYear = new Date(Date.UTC(referenceYear, 0, 1))

    const [activeCount, newJoined, exited, activeCountLastYear] = await Promise.all([
      this.prisma.employee.count({ where: { ...dimensionWhere, employmentStatus: "ACTIVE" } }),
      this.prisma.employee.count({
        where: { ...dimensionWhere, ...(from || to ? { employmentStartDate: { gte: from, lte: to } } : { employmentStartDate: undefined }) },
      }),
      this.prisma.employee.count({
        where: { ...dimensionWhere, employmentStatus: "EXIT", ...(from || to ? { exitDate: { gte: from, lte: to } } : {}) },
      }),
      this.prisma.employee.count({
        where: {
          ...dimensionWhere,
          employmentStartDate: { lt: asOfLastYear },
          OR: [{ employmentStatus: "ACTIVE" }, { exitDate: { gte: asOfLastYear } }],
        },
      }),
    ])

    const changePercent = activeCountLastYear === 0 ? null : round1(((activeCount - activeCountLastYear) / activeCountLastYear) * 100)

    return { activeCount, newJoined, exited, changePercent }
  }

  /** Average Employee Age: org-wide, by department, and a 5-year trend. */
  async averageAge(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const employees = await this.prisma.employee.findMany({
      where: { ...dimensionWhere, employmentStatus: "ACTIVE" },
      select: { dateOfBirth: true, position: { select: { department: { select: { id: true, name: true } } } } },
    })

    const overall = employees.length === 0 ? null : round1(employees.reduce((sum, e) => sum + ageInYears(e.dateOfBirth), 0) / employees.length)

    const byDeptTotals = new Map<string, { name: string; sum: number; count: number }>()
    for (const e of employees) {
      const dept = e.position?.department
      const key = dept?.id ?? "unassigned"
      const entry = byDeptTotals.get(key) ?? { name: dept?.name ?? "Unassigned", sum: 0, count: 0 }
      entry.sum += ageInYears(e.dateOfBirth)
      entry.count += 1
      byDeptTotals.set(key, entry)
    }
    const byDepartment = Array.from(byDeptTotals.entries())
      .map(([departmentId, v]) => ({ departmentId, departmentName: v.name, averageAge: round1(v.sum / v.count) }))
      .sort((a, b) => b.averageAge - a.averageAge)

    // Trend: current average age "as of" each of the last 5 years, computed
    // from employees who were active then (joined by then, hadn't exited yet).
    const currentYear = new Date().getFullYear()
    const trendYears = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)
    const allEmployees = await this.prisma.employee.findMany({
      where: dimensionWhere,
      select: { dateOfBirth: true, employmentStartDate: true, exitDate: true },
    })
    const trend = trendYears.map((year) => {
      const asOf = new Date(Date.UTC(year, 11, 31))
      const activeThen = allEmployees.filter((e) => e.employmentStartDate && e.employmentStartDate <= asOf && (!e.exitDate || e.exitDate > asOf))
      return {
        year,
        averageAge: activeThen.length === 0 ? null : round1(activeThen.reduce((sum, e) => sum + ageInYears(e.dateOfBirth, asOf), 0) / activeThen.length),
      }
    })

    return { overall, byDepartment, trend }
  }

  /** Band Distribution — headcount + percent share across every Band. */
  async bandDistribution(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const [bands, employees] = await Promise.all([
      this.prisma.band.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
      this.prisma.employee.findMany({ where: { ...dimensionWhere, employmentStatus: "ACTIVE" }, select: { bandId: true } }),
    ])

    const total = employees.length
    const countByBand = new Map<string, number>()
    for (const e of employees) {
      const key = e.bandId ?? "unassigned"
      countByBand.set(key, (countByBand.get(key) ?? 0) + 1)
    }

    const rows = bands.map((band) => ({
      bandId: band.id,
      bandName: band.name,
      rank: band.rank,
      count: countByBand.get(band.id) ?? 0,
      percent: total === 0 ? 0 : round1(((countByBand.get(band.id) ?? 0) / total) * 100),
    }))
    const unassignedCount = countByBand.get("unassigned") ?? 0
    if (unassignedCount > 0) {
      rows.push({ bandId: "unassigned", bandName: "Unassigned", rank: 9999, count: unassignedCount, percent: round1((unassignedCount / total) * 100) })
    }

    return rows
  }

  /** Attrition Rate = exits during period / average headcount during period. */
  async attritionRate(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const year = filters.year ?? new Date().getFullYear()
    const { from, to } = resolveDateRange({ ...filters, year })

    const compute = async (periodFrom: Date, periodTo: Date) => {
      const [exits, startCount, endCount] = await Promise.all([
        this.prisma.employee.count({ where: { ...dimensionWhere, exitDate: { gte: periodFrom, lte: periodTo } } }),
        this.prisma.employee.count({
          where: { ...dimensionWhere, employmentStartDate: { lt: periodFrom }, OR: [{ employmentStatus: "ACTIVE" }, { exitDate: { gte: periodFrom } }] },
        }),
        this.prisma.employee.count({
          where: { ...dimensionWhere, employmentStartDate: { lt: periodTo }, OR: [{ employmentStatus: "ACTIVE" }, { exitDate: { gte: periodTo } }] },
        }),
      ])
      const average = (startCount + endCount) / 2
      return { exits, rate: average === 0 ? 0 : round2((exits / average) * 100) }
    }

    const currentRange = from && to ? { from, to } : { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) }
    const previousRange = { from: new Date(Date.UTC(year - 1, 0, 1)), to: new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59)) }

    const [current, previous] = await Promise.all([compute(currentRange.from, currentRange.to), compute(previousRange.from, previousRange.to)])

    const exitedEmployees = await this.prisma.employee.findMany({
      where: { ...dimensionWhere, exitDate: { gte: currentRange.from, lte: currentRange.to } },
      select: {
        contractType: true,
        bandId: true,
        band: { select: { name: true } },
        branchId: true,
        branch: { select: { name: true } },
        position: { select: { departmentId: true, department: { select: { name: true, functionId: true, function: { select: { name: true } } } } } },
      },
    })

    const groupBy = (items: typeof exitedEmployees, keyOf: (e: (typeof exitedEmployees)[number]) => { key: string; label: string } | null) => {
      const counts = new Map<string, { label: string; count: number }>()
      for (const e of items) {
        const grouped = keyOf(e)
        if (!grouped) continue
        const entry = counts.get(grouped.key) ?? { label: grouped.label, count: 0 }
        entry.count += 1
        counts.set(grouped.key, entry)
      }
      return Array.from(counts.entries()).map(([key, v]) => ({ key, label: v.label, count: v.count })).sort((a, b) => b.count - a.count)
    }

    return {
      rate: current.rate,
      exits: current.exits,
      previousYearRate: previous.rate,
      changePercent: round2(current.rate - previous.rate),
      breakdown: {
        byDepartment: groupBy(exitedEmployees, (e) => (e.position?.department ? { key: e.position.departmentId!, label: e.position.department.name } : null)),
        byFunction: groupBy(exitedEmployees, (e) => (e.position?.department?.function ? { key: e.position.department.functionId!, label: e.position.department.function.name } : null)),
        byBranch: groupBy(exitedEmployees, (e) => (e.branch ? { key: e.branchId!, label: e.branch.name } : null)),
        byContractType: groupBy(exitedEmployees, (e) => (e.contractType ? { key: e.contractType, label: e.contractType } : null)),
        byBand: groupBy(exitedEmployees, (e) => (e.band ? { key: e.bandId!, label: e.band.name } : null)),
      },
    }
  }

  /** Position Fill Rate — org-wide + the "by department" chart in one call. */
  async positionFillRate(filters: HrAnalyticsFilters) {
    // Position has no owner/employee field to run through
    // buildEmployeeDimensionWhere's scope mechanism, so role-scoping is
    // applied directly here: a non-admin is restricted to the department(s)
    // they head, same restriction as everywhere else in this module. An
    // explicit departmentId filter outside that set is intersected away
    // rather than honored — a non-admin can't widen their own scope by
    // picking a different department in the filter bar. A non-admin who
    // heads no department at all (an individual contributor / plain
    // manager) sees zero positions here, since org structure isn't
    // meaningful at the individual level for this particular chart.
    const scopedDepartmentIds =
      filters.scopeAllowAll === false
        ? filters.departmentId && filters.scopeDepartmentIds?.includes(filters.departmentId)
          ? [filters.departmentId]
          : (filters.scopeDepartmentIds ?? [])
        : filters.departmentId
          ? [filters.departmentId]
          : null

    const where = {
      isActive: true,
      ...(scopedDepartmentIds ? { departmentId: { in: scopedDepartmentIds } } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.levelId ? { levelId: filters.levelId } : {}),
      ...(filters.functionId ? { department: { functionId: filters.functionId } } : {}),
    }

    const positions = await this.prisma.position.findMany({
      where,
      select: {
        id: true,
        departmentId: true,
        department: { select: { name: true, functionId: true, function: { select: { name: true } } } },
        unitId: true,
        unit: { select: { name: true } },
        employees: { where: { employmentStatus: "ACTIVE" }, select: { employeeNumber: true } },
      },
    })

    const total = positions.length
    const filled = positions.filter((p) => p.employees.length > 0).length
    const fillRate = total === 0 ? 0 : round1((filled / total) * 100)

    const byDept = new Map<string, { name: string; filled: number; total: number }>()
    const byUnit = new Map<string, { name: string; filled: number; total: number }>()
    const byFunction = new Map<string, { name: string; filled: number; total: number }>()
    for (const p of positions) {
      const isFilled = p.employees.length > 0
      const deptEntry = byDept.get(p.departmentId) ?? { name: p.department.name, filled: 0, total: 0 }
      deptEntry.total += 1
      if (isFilled) deptEntry.filled += 1
      byDept.set(p.departmentId, deptEntry)

      if (p.unitId) {
        const unitEntry = byUnit.get(p.unitId) ?? { name: p.unit?.name ?? "Unknown", filled: 0, total: 0 }
        unitEntry.total += 1
        if (isFilled) unitEntry.filled += 1
        byUnit.set(p.unitId, unitEntry)
      }

      const fnEntry = byFunction.get(p.department.functionId) ?? { name: p.department.function.name, filled: 0, total: 0 }
      fnEntry.total += 1
      if (isFilled) fnEntry.filled += 1
      byFunction.set(p.department.functionId, fnEntry)
    }

    const toRows = (m: Map<string, { name: string; filled: number; total: number }>, idKey: string) =>
      Array.from(m.entries())
        .map(([id, v]) => ({ [idKey]: id, name: v.name, filled: v.filled, total: v.total, fillRate: v.total === 0 ? 0 : round1((v.filled / v.total) * 100) }))
        .sort((a, b) => a.fillRate - b.fillRate)

    return {
      fillRate,
      filled,
      total,
      byDepartment: toRows(byDept, "departmentId"),
      byUnit: toRows(byUnit, "unitId"),
      byFunction: toRows(byFunction, "functionId"),
    }
  }

  /** Leave Utilization Summary KPI card — entitlement/taken/remaining, direct
   *  from LeaveBalance (LeaveAnalyticsService doesn't expose entitlement
   *  totals, only days-taken aggregates, so this is computed independently
   *  rather than bolted onto that service). */
  async leaveUtilizationSummary(filters: HrAnalyticsFilters) {
    const year = filters.year ?? new Date().getFullYear()
    const dimensionWhere = buildEmployeeDimensionWhere(filters)

    // "On leave right now" — same APPROVED + startDate<=today<=endDate rule
    // as LeaveAnalyticsService.currentlyOnLeave(), computed independently
    // here (rather than injecting that service) since this method already
    // owns its own employee scoping via dimensionWhere and this is a single
    // count, not worth a cross-module dependency for.
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const currentlyOnLeaveCount = await this.prisma.leaveRequest.count({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today }, employee: dimensionWhere },
    })

    const balances = await this.prisma.leaveBalance.findMany({
      where: { year, employee: dimensionWhere, leaveType: { category: "ANNUAL" } },
      select: {
        entitledDays: true,
        carriedForwardDays: true,
        adjustmentDays: true,
        takenDays: true,
        employeeId: true,
        employee: { select: { branchId: true, branch: { select: { name: true } }, position: { select: { departmentId: true, department: { select: { name: true } } } } } },
      },
    })

    const totalEntitlement = balances.reduce((s, b) => s + b.entitledDays + b.carriedForwardDays + b.adjustmentDays, 0)
    const totalTaken = balances.reduce((s, b) => s + b.takenDays, 0)
    const totalRemaining = totalEntitlement - totalTaken
    const utilizationPercent = totalEntitlement === 0 ? 0 : round1((totalTaken / totalEntitlement) * 100)

    const byDept = new Map<string, { name: string; entitlement: number; taken: number }>()
    const byBranch = new Map<string, { name: string; entitlement: number; taken: number }>()
    for (const b of balances) {
      const entitlement = b.entitledDays + b.carriedForwardDays + b.adjustmentDays
      const dept = b.employee.position?.department
      if (dept) {
        const key = b.employee.position!.departmentId!
        const entry = byDept.get(key) ?? { name: dept.name, entitlement: 0, taken: 0 }
        entry.entitlement += entitlement
        entry.taken += b.takenDays
        byDept.set(key, entry)
      }
      if (b.employee.branch) {
        const key = b.employee.branchId!
        const entry = byBranch.get(key) ?? { name: b.employee.branch.name, entitlement: 0, taken: 0 }
        entry.entitlement += entitlement
        entry.taken += b.takenDays
        byBranch.set(key, entry)
      }
    }

    const toRows = (m: Map<string, { name: string; entitlement: number; taken: number }>, idKey: string) =>
      Array.from(m.entries()).map(([id, v]) => ({
        [idKey]: id,
        name: v.name,
        entitlement: v.entitlement,
        taken: v.taken,
        utilizationPercent: v.entitlement === 0 ? 0 : round1((v.taken / v.entitlement) * 100),
      }))

    return {
      totalEntitlement,
      totalTaken,
      totalRemaining,
      utilizationPercent,
      currentlyOnLeaveCount,
      byDepartment: toRows(byDept, "departmentId"),
      byBranch: toRows(byBranch, "branchId"),
    }
  }

  // ==== Charts (no existing service to delegate to) ==============================

  /** Employee Distribution by Department — pie/donut chart. */
  async employeeDistributionByDepartment(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const employees = await this.prisma.employee.findMany({
      where: { ...dimensionWhere, employmentStatus: "ACTIVE" },
      select: { position: { select: { department: { select: { id: true, name: true } } } } },
    })

    const total = employees.length
    const counts = new Map<string, { name: string; count: number }>()
    for (const e of employees) {
      const dept = e.position?.department
      const key = dept?.id ?? "unassigned"
      const entry = counts.get(key) ?? { name: dept?.name ?? "Unassigned", count: 0 }
      entry.count += 1
      counts.set(key, entry)
    }

    return Array.from(counts.entries())
      .map(([departmentId, v]) => ({ departmentId, departmentName: v.name, count: v.count, percent: total === 0 ? 0 : round1((v.count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
  }

  /** Exit Summary — count, reasons, trend, and breakdowns. */
  async exitSummary(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const { from, to } = resolveDateRange(filters)

    const exited = await this.prisma.employee.findMany({
      where: { ...dimensionWhere, exitDate: from || to ? { gte: from, lte: to } : { not: null } },
      select: {
        exitDate: true,
        exitReason: true,
        exitType: true,
        contractType: true,
        branch: { select: { id: true, name: true } },
        position: { select: { department: { select: { id: true, name: true } } } },
      },
    })

    const byReason = this.countBy(exited, (e) => (e.exitReason ? { key: e.exitReason, label: e.exitReason } : null))
    const byType = this.countBy(exited, (e) => (e.exitType ? { key: e.exitType, label: e.exitType } : null))
    const byDepartment = this.countBy(exited, (e) => (e.position?.department ? { key: e.position.department.id, label: e.position.department.name } : null))
    const byBranch = this.countBy(exited, (e) => (e.branch ? { key: e.branch.id, label: e.branch.name } : null))
    const byContractType = this.countBy(exited, (e) => (e.contractType ? { key: e.contractType, label: e.contractType } : null))

    // Multi-year trend — last 5 years by default, or the exact `years` list
    // when the caller is doing a multi-year compare.
    const currentYear = new Date().getFullYear()
    const trendYears = filters.years?.length ? filters.years : Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)
    const allExits = await this.prisma.employee.findMany({ where: { ...dimensionWhere, exitDate: { not: null } }, select: { exitDate: true } })
    const trend = trendYears.map((year) => ({
      year,
      exits: allExits.filter((e) => e.exitDate!.getUTCFullYear() === year).length,
    }))

    return { totalExits: exited.length, byReason, byType, byDepartment, byBranch, byContractType, trend }
  }

  /** Hiring vs Exit Trend — one point per year, hires (employmentStartDate)
   *  against exits (exitDate). Defaults to every year the actual data spans
   *  (earliest recorded hire through the current year, capped at 10 years
   *  back so one bad legacy-import date can't blow out the chart's x-axis)
   *  rather than a fixed lookback window, since this is meant to show "all
   *  years" of real hiring/exit history — not just a recent-years compare
   *  like exitSummary()'s own trend. An explicit `years` filter still wins. */
  async hiringExitTrend(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const employees = await this.prisma.employee.findMany({
      where: dimensionWhere,
      select: { employmentStartDate: true, exitDate: true },
    })

    const currentYear = new Date().getUTCFullYear()
    let trendYears: number[]
    if (filters.years?.length) {
      trendYears = filters.years
    } else {
      const hireYears = employees
        .map((e) => e.employmentStartDate?.getUTCFullYear())
        .filter((y): y is number => y !== undefined && y !== null)
      const earliestYear = hireYears.length > 0 ? Math.min(...hireYears) : currentYear
      const startYear = Math.max(earliestYear, currentYear - 10)
      trendYears = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i)
    }

    return trendYears.map((year) => ({
      year,
      hires: employees.filter((e) => e.employmentStartDate?.getUTCFullYear() === year).length,
      exits: employees.filter((e) => e.exitDate?.getUTCFullYear() === year).length,
    }))
  }

  /** Employee Demographics — age histogram, gender, contract type. */
  async employeeDemographics(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const employees = await this.prisma.employee.findMany({
      where: { ...dimensionWhere, employmentStatus: "ACTIVE" },
      select: { dateOfBirth: true, gender: true, contractType: true },
    })

    const buckets = [
      { label: "Under 25", min: 0, max: 25 },
      { label: "25-35", min: 25, max: 35 },
      { label: "35-45", min: 35, max: 45 },
      { label: "45+", min: 45, max: Infinity },
    ]
    const ageHistogram = buckets.map((bucket) => ({
      bucket: bucket.label,
      count: employees.filter((e) => {
        const age = ageInYears(e.dateOfBirth)
        return age >= bucket.min && age < bucket.max
      }).length,
    }))

    const genderDistribution = this.countBy(employees, (e) => ({ key: e.gender, label: e.gender }))
    const contractTypeDistribution = this.countBy(employees, (e) => (e.contractType ? { key: e.contractType, label: e.contractType } : null))

    return { ageHistogram, genderDistribution, contractTypeDistribution, totalActive: employees.length }
  }

  /** Organizational Structure Analytics. */
  async orgStructureAnalytics(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const [employeesByFunction, employeesByDepartment, employeesByUnit, positions] = await Promise.all([
      this.prisma.employee.findMany({
        where: { ...dimensionWhere, employmentStatus: "ACTIVE" },
        select: { position: { select: { department: { select: { functionId: true, function: { select: { name: true } } } } } } },
      }),
      this.employeeDistributionByDepartment(filters),
      this.prisma.employee.findMany({
        where: { ...dimensionWhere, employmentStatus: "ACTIVE", position: { unitId: { not: null } } },
        select: { position: { select: { unit: { select: { id: true, name: true } } } } },
      }),
      this.prisma.position.findMany({
        where: { isActive: true },
        select: { id: true, title: true, reportsToPositionId: true, employees: { where: { employmentStatus: "ACTIVE" }, select: { employeeNumber: true, firstName: true, lastName: true } } },
      }),
    ])

    const byFunction = this.countBy(employeesByFunction, (e) => (e.position?.department?.function ? { key: e.position.department.functionId!, label: e.position.department.function.name } : null))
    const byUnit = this.countBy(employeesByUnit, (e) => (e.position?.unit ? { key: e.position.unit.id, label: e.position.unit.name } : null))

    const positionsWithReports = new Set(positions.filter((p) => p.reportsToPositionId).map((p) => p.reportsToPositionId!))
    const managerPositionIds = new Set(positions.filter((p) => positionsWithReports.has(p.id)).map((p) => p.id))
    let managers = 0
    let individualContributors = 0
    const spanOfControl: { employeeId: string; name: string; positionTitle: string; directReports: number }[] = []
    for (const p of positions) {
      const isManagerPosition = managerPositionIds.has(p.id)
      const headcount = p.employees.length
      if (isManagerPosition) managers += headcount
      else individualContributors += headcount

      if (isManagerPosition) {
        const reportCount = positions.filter((child) => child.reportsToPositionId === p.id).reduce((sum, child) => sum + child.employees.length, 0)
        for (const emp of p.employees) {
          spanOfControl.push({ employeeId: emp.employeeNumber, name: `${emp.firstName} ${emp.lastName}`, positionTitle: p.title, directReports: reportCount })
        }
      }
    }
    spanOfControl.sort((a, b) => b.directReports - a.directReports)

    return {
      byFunction,
      byDepartment: employeesByDepartment,
      byUnit,
      managersVsIndividualContributors: { managers, individualContributors },
      spanOfControl: spanOfControl.slice(0, 25),
      averageSpanOfControl: spanOfControl.length === 0 ? 0 : round1(spanOfControl.reduce((s, r) => s + r.directReports, 0) / spanOfControl.length),
    }
  }

  /** Employee Experience Analytics — tenure, banking experience, extremes. */
  async employeeExperienceAnalytics(filters: HrAnalyticsFilters) {
    const dimensionWhere = buildEmployeeDimensionWhere(filters)
    const employees = await this.prisma.employee.findMany({
      where: { ...dimensionWhere, employmentStatus: "ACTIVE", employmentStartDate: { not: null } },
      select: {
        employeeNumber: true,
        firstName: true,
        lastName: true,
        employmentStartDate: true,
        dateOfBirth: true,
        previousBankingExperienceYears: true,
        position: { select: { title: true } },
      },
    })

    const now = new Date()
    const withTenure = employees.map((e) => ({
      ...e,
      tenureYears: ageInYears(e.employmentStartDate!, now),
    }))
    const withBankingExperience = withTenure.map((e) => ({ ...e, totalBankingExperienceYears: e.tenureYears + (e.previousBankingExperienceYears ?? 0) }))

    const averageTenureYears = withTenure.length === 0 ? 0 : round1(withTenure.reduce((s, e) => s + e.tenureYears, 0) / withTenure.length)
    const averageBankingExperienceYears = withBankingExperience.length === 0 ? 0 : round1(withBankingExperience.reduce((s, e) => s + e.totalBankingExperienceYears, 0) / withBankingExperience.length)

    const toSummary = (e: (typeof withTenure)[number]) => ({
      employeeId: e.employeeNumber,
      name: `${e.firstName} ${e.lastName}`,
      positionTitle: e.position?.title ?? null,
      tenureYears: round1(e.tenureYears),
    })

    const longestServing = [...withTenure].sort((a, b) => b.tenureYears - a.tenureYears).slice(0, 10).map(toSummary)
    const newest = [...withTenure].sort((a, b) => a.tenureYears - b.tenureYears).slice(0, 10).map(toSummary)

    // Rwanda's statutory retirement age is 65 — used only to flag employees
    // within 3 years of it, not to enforce anything.
    const RETIREMENT_AGE = 65
    const approachingRetirement = employees
      .map((e) => ({ employeeId: e.employeeNumber, name: `${e.firstName} ${e.lastName}`, age: round1(ageInYears(e.dateOfBirth)), yearsToRetirement: round1(RETIREMENT_AGE - ageInYears(e.dateOfBirth)) }))
      .filter((e) => e.yearsToRetirement <= 3 && e.yearsToRetirement >= 0)
      .sort((a, b) => a.yearsToRetirement - b.yearsToRetirement)

    return { averageTenureYears, averageBankingExperienceYears, longestServing, newest, approachingRetirement }
  }

  private countBy<T>(items: T[], keyOf: (item: T) => { key: string; label: string } | null) {
    const counts = new Map<string, { label: string; count: number }>()
    for (const item of items) {
      const grouped = keyOf(item)
      if (!grouped) continue
      const entry = counts.get(grouped.key) ?? { label: grouped.label, count: 0 }
      entry.count += 1
      counts.set(grouped.key, entry)
    }
    return Array.from(counts.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count)
  }
}
