import { Injectable } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

export interface AnalyticsFilters {
  departmentId?: string
  functionId?: string
  workLocation?: string
  employeeId?: string
  year?: number
}

/**
 * Executive reporting over leave data. Aggregation is done in JS after a
 * filtered fetch rather than raw SQL group-by — simplest to keep correct
 * given the filter combinations, and perfectly fine at HR-system scale
 * (thousands, not millions, of leave requests).
 */
@Injectable()
export class LeaveAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private yearRange(year: number) {
    return { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) }
  }

  private employeeWhere(filters: AnalyticsFilters): Prisma.EmployeeWhereInput {
    return {
      ...(filters.employeeId ? { id: filters.employeeId } : {}),
      ...(filters.workLocation ? { workLocation: filters.workLocation as never } : {}),
      ...(filters.departmentId || filters.functionId
        ? {
            position: {
              ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
              ...(filters.functionId ? { department: { functionId: filters.functionId } } : {}),
            },
          }
        : {}),
    }
  }

  private async approvedRequests(filters: AnalyticsFilters) {
    const year = filters.year ?? new Date().getFullYear()
    return this.prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: this.yearRange(year),
        employee: this.employeeWhere(filters),
      },
      select: {
        numberOfDays: true,
        startDate: true,
        leaveType: { select: { id: true, name: true } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            workLocation: true,
            position: { select: { department: { select: { id: true, name: true } } } },
          },
        },
      },
    })
  }

  async utilizationByDepartment(filters: AnalyticsFilters) {
    const requests = await this.approvedRequests(filters)
    const totals = new Map<string, { departmentId: string; departmentName: string; days: number; requests: number }>()

    for (const request of requests) {
      const department = request.employee.position?.department
      const key = department?.id ?? "unassigned"
      const entry = totals.get(key) ?? {
        departmentId: key,
        departmentName: department?.name ?? "Unassigned",
        days: 0,
        requests: 0,
      }
      entry.days += request.numberOfDays
      entry.requests += 1
      totals.set(key, entry)
    }

    return Array.from(totals.values()).sort((a, b) => b.days - a.days)
  }

  async utilizationByBranch(filters: AnalyticsFilters) {
    const requests = await this.approvedRequests(filters)
    const totals = new Map<string, { workLocation: string; days: number; requests: number }>()

    for (const request of requests) {
      const key = request.employee.workLocation
      const entry = totals.get(key) ?? { workLocation: key, days: 0, requests: 0 }
      entry.days += request.numberOfDays
      entry.requests += 1
      totals.set(key, entry)
    }

    return Array.from(totals.values()).sort((a, b) => b.days - a.days)
  }

  async utilizationByGender(filters: AnalyticsFilters) {
    const requests = await this.approvedRequests(filters)
    const totals = new Map<string, { gender: string; days: number; requests: number }>()

    for (const request of requests) {
      const key = request.employee.gender
      const entry = totals.get(key) ?? { gender: key, days: 0, requests: 0 }
      entry.days += request.numberOfDays
      entry.requests += 1
      totals.set(key, entry)
    }

    return Array.from(totals.values())
  }

  async monthlyTrends(filters: AnalyticsFilters) {
    const requests = await this.approvedRequests(filters)
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      days: 0,
      requests: 0,
    }))

    for (const request of requests) {
      const monthIndex = request.startDate.getUTCMonth()
      months[monthIndex].days += request.numberOfDays
      months[monthIndex].requests += 1
    }

    return months
  }

  async typeDistribution(filters: AnalyticsFilters) {
    const requests = await this.approvedRequests(filters)
    const totals = new Map<string, { leaveTypeId: string; leaveTypeName: string; days: number; requests: number }>()

    for (const request of requests) {
      const key = request.leaveType.id
      const entry = totals.get(key) ?? {
        leaveTypeId: key,
        leaveTypeName: request.leaveType.name,
        days: 0,
        requests: 0,
      }
      entry.days += request.numberOfDays
      entry.requests += 1
      totals.set(key, entry)
    }

    return Array.from(totals.values()).sort((a, b) => b.days - a.days)
  }

  async balanceExtremes(filters: AnalyticsFilters, limit = 10) {
    const year = filters.year ?? new Date().getFullYear()
    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        year,
        leaveType: { category: "ANNUAL" },
        employee: this.employeeWhere(filters),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
    })

    const withRemaining = balances.map((balance) => ({
      employeeId: balance.employee.id,
      employeeName: `${balance.employee.firstName} ${balance.employee.lastName}`,
      leaveTypeName: balance.leaveType.name,
      remainingDays:
        balance.entitledDays + balance.carriedForwardDays + balance.adjustmentDays -
        balance.takenDays -
        balance.pendingDays,
    }))

    const highest = [...withRemaining].sort((a, b) => b.remainingDays - a.remainingDays).slice(0, limit)
    const lowest = [...withRemaining].sort((a, b) => a.remainingDays - b.remainingDays).slice(0, limit)

    return { highest, lowest }
  }

  async upcomingLeave(filters: AnalyticsFilters, daysAhead = 30) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const until = new Date(today)
    until.setUTCDate(until.getUTCDate() + daysAhead)

    return this.prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { gte: today, lte: until },
        employee: this.employeeWhere(filters),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
    })
  }

  async currentlyOnLeave(filters: AnalyticsFilters) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    return this.prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
        employee: this.employeeWhere(filters),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: { select: { title: true, department: { select: { name: true } } } },
          },
        },
        leaveType: { select: { name: true } },
      },
      orderBy: { endDate: "asc" },
    })
  }
}
