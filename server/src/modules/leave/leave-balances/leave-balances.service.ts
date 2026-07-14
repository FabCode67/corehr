import { Injectable, NotFoundException } from "@nestjs/common"
import { ContractType, LeaveEntitlementCategory, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { AdjustBalanceDto } from "./dto/adjust-balance.dto"

/**
 * Owns LeaveBalance: resolving what an employee is entitled to (per the
 * HR-configured LeaveEntitlementRule table for Annual Leave, or a flat
 * LeaveType.maxDaysPerYear for everything else — see schema.prisma), and
 * keeping the taken/pending counters in sync as requests move through
 * their lifecycle. `remaining` is always computed on read, never stored.
 *
 * A leave request that spans a year boundary is booked entirely against
 * its start date's year — a deliberate simplification, noted here so it's
 * easy to revisit if year-spanning leave becomes common.
 */
@Injectable()
export class LeaveBalancesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * (Re)computes entitledDays for every leave type this employee is
   * eligible for, creating the LeaveBalance row if it doesn't exist yet or
   * correcting it if the employee's category has since changed (e.g.
   * contract type updated, or promoted into the Managing Director
   * position). Safe to call repeatedly — called from EmployeesService
   * after create / employment-details update / position assignment.
   */
  async ensureBalancesForEmployee(employeeId: string, year = new Date().getFullYear()) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: { include: { level: true } } },
    })
    if (!employee) return

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { isActive: true },
      include: { entitlementRules: true },
    })

    const category = this.resolveEntitlementCategory(
      employee.contractType,
      employee.position?.level?.code ?? null
    )

    for (const leaveType of leaveTypes) {
      if (leaveType.genderRestriction && leaveType.genderRestriction !== employee.gender) {
        continue // e.g. no Maternity balance for a male employee
      }

      let entitledDays: number
      if (leaveType.category === "ANNUAL") {
        if (!category) continue // contract type not set yet — nothing to allocate
        const rule = leaveType.entitlementRules.find((r) => r.employeeCategory === category)
        entitledDays = rule?.days ?? 0
      } else {
        entitledDays = leaveType.maxDaysPerYear ?? 0
      }

      const existing = await this.prisma.leaveBalance.findUnique({
        where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId: leaveType.id, year } },
      })

      if (existing) {
        if (existing.entitledDays !== entitledDays) {
          await this.prisma.leaveBalance.update({
            where: { id: existing.id },
            data: { entitledDays },
          })
        }
      } else {
        await this.prisma.leaveBalance.create({
          data: { employeeId, leaveTypeId: leaveType.id, year, entitledDays },
        })
      }
    }
  }

  async getSummary(employeeId: string, year = new Date().getFullYear()) {
    await this.ensureBalancesForEmployee(employeeId, year)

    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
      orderBy: { leaveType: { name: "asc" } },
    })

    return balances.map((balance) => ({
      ...balance,
      remainingDays:
        balance.entitledDays + balance.carriedForwardDays + balance.adjustmentDays -
        balance.takenDays -
        balance.pendingDays,
    }))
  }

  async getOrCreate(employeeId: string, leaveTypeId: string, year: number) {
    await this.ensureBalancesForEmployee(employeeId, year)
    const balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    })
    if (!balance) {
      throw new NotFoundException("This employee is not eligible for this leave type.")
    }
    return balance
  }

  async adjust(employeeId: string, leaveTypeId: string, year: number, dto: AdjustBalanceDto) {
    await this.getOrCreate(employeeId, leaveTypeId, year)
    return this.prisma.leaveBalance.update({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
      data: { adjustmentDays: dto.adjustmentDays },
      include: { leaveType: true },
    })
  }

  /** Reserves days against pendingDays when a request is submitted. */
  reserve(employeeId: string, leaveTypeId: string, year: number, days: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    return client.leaveBalance.update({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
      data: { pendingDays: { increment: days } },
    })
  }

  /** Releases a pending reservation without booking it as taken —
   *  rejection or cancellation before approval. */
  release(employeeId: string, leaveTypeId: string, year: number, days: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    return client.leaveBalance.update({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
      data: { pendingDays: { decrement: days } },
    })
  }

  /** Moves a reservation from pending to taken — final approval. */
  commit(employeeId: string, leaveTypeId: string, year: number, days: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    return client.leaveBalance.update({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
      data: { pendingDays: { decrement: days }, takenDays: { increment: days } },
    })
  }

  /** Reverses an already-approved (taken) leave — cancelling leave that
   *  was approved but hasn't been fully re-processed as pending again. */
  reverseTaken(employeeId: string, leaveTypeId: string, year: number, days: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    return client.leaveBalance.update({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
      data: { takenDays: { decrement: days } },
    })
  }

  /**
   * Admin-triggered carry-forward run: for every LeaveType with an enabled
   * LeaveCarryForwardRule, computes each employee's unused (remaining) days
   * in `fromYear`, caps them at the rule's maxDays (if set), and writes the
   * result into `carriedForwardDays` on the employee's `toYear` balance row
   * (creating it first via ensureBalancesForEmployee if needed). Overwrites
   * rather than increments, so the run is safe to repeat for the same
   * fromYear/toYear pair. Expiry of carried-forward days
   * (LeaveCarryForwardRule.expiresAfterDays) is stored for the admin UI to
   * surface but is not yet auto-zeroed by a scheduled job — noted here for
   * future work.
   */
  async runCarryForward(fromYear: number, toYear: number) {
    const rules = await this.prisma.leaveCarryForwardRule.findMany({
      where: { enabled: true },
      include: { leaveType: true },
    })

    const results: Array<{
      employeeId: string
      leaveTypeId: string
      leaveTypeName: string
      carriedDays: number
    }> = []

    for (const rule of rules) {
      const balances = await this.prisma.leaveBalance.findMany({
        where: { leaveTypeId: rule.leaveTypeId, year: fromYear },
      })

      for (const balance of balances) {
        const remaining =
          balance.entitledDays + balance.carriedForwardDays + balance.adjustmentDays -
          balance.takenDays -
          balance.pendingDays

        if (remaining <= 0) continue

        const carriedDays = rule.maxDays != null ? Math.min(remaining, rule.maxDays) : remaining

        await this.ensureBalancesForEmployee(balance.employeeId, toYear)
        await this.prisma.leaveBalance.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: balance.employeeId,
              leaveTypeId: rule.leaveTypeId,
              year: toYear,
            },
          },
          data: { carriedForwardDays: carriedDays },
        })

        results.push({
          employeeId: balance.employeeId,
          leaveTypeId: rule.leaveTypeId,
          leaveTypeName: rule.leaveType.name,
          carriedDays,
        })
      }
    }

    return { fromYear, toYear, employeesAffected: results.length, results }
  }

  private resolveEntitlementCategory(
    contractType: ContractType | null,
    positionLevelCode: string | null
  ): LeaveEntitlementCategory | null {
    if (positionLevelCode === "E1") {
      return LeaveEntitlementCategory.MANAGING_DIRECTOR
    }
    switch (contractType) {
      case "PERMANENT":
        return LeaveEntitlementCategory.PERMANENT
      case "TEMPORARY":
        return LeaveEntitlementCategory.TEMPORARY
      case "GRADUATE_TRAINEE":
        return LeaveEntitlementCategory.GRADUATE_TRAINEE
      case "INTERN":
        return LeaveEntitlementCategory.INTERN
      default:
        return null
    }
  }
}
