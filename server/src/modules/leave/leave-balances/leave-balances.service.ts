import { Injectable, NotFoundException } from "@nestjs/common"
import { ContractType, LeaveEntitlementCategory, NotificationType, Prisma } from "@prisma/client"

import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { NotificationsService } from "../notifications/notifications.service"

import { AdjustBalanceDto } from "./dto/adjust-balance.dto"

// Carry-forward-expiring notifications fire whenever getSummary() is called
// within this window of the expiry date — see that method's doc comment
// for why this is "on page visit" rather than a scheduled job.
const CARRY_FORWARD_EXPIRY_WARNING_DAYS = 30

// Same "on page visit, not a timer" approach as carry-forward-expiring
// above — LOW_BALANCE (an existing but previously-unused NotificationType)
// and the leave_low_balance email both fire here too. No dedup: a balance
// under threshold will re-notify on every getSummary() call while it stays
// under threshold, same trade-off already accepted for carry-forward.
const LOW_BALANCE_THRESHOLD_DAYS = 3

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService
  ) {}

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
      where: { employeeNumber: employeeId },
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

  /**
   * Carry-forward expiry is computed here on every read rather than by a
   * scheduled job (this codebase has no background scheduler anywhere —
   * see runCarryForward()'s doc comment) — expiresAt is Jan 1 of `year`
   * plus the rule's expiresAfterDays, and `carryForwardExpired` only ever
   * becomes true if the rule has autoExpiryEnabled. When expired, the
   * carried-forward days are excluded from remainingDays (the original
   * carriedForwardDays value is still returned for transparency) — a
   * simplification that doesn't account for how much of the carry-forward
   * portion specifically was already taken before it expired.
   *
   * Also fires a one-off LEAVE_CARRY_FORWARD_EXPIRING notification
   * whenever a balance is found to be within the warning window and not
   * yet expired — intentionally naive ("fires on page visit, not on a
   * timer" per the no-scheduler design decision), so it may repeat on
   * every call rather than being deduplicated.
   */
  async getSummary(employeeId: string, year = new Date().getFullYear()) {
    await this.ensureBalancesForEmployee(employeeId, year)

    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: { include: { carryForwardRule: true, attachmentRequirements: true } } },
      orderBy: { leaveType: { name: "asc" } },
    })

    const now = new Date()
    // Only fetched if at least one balance actually needs a name/email for
    // a notification below — most getSummary() calls trigger neither.
    let employeeContact: { firstName: string; lastName: string; email: string } | null | undefined

    const getEmployeeContact = async () => {
      if (employeeContact === undefined) {
        employeeContact = await this.prisma.employee.findUnique({
          where: { employeeNumber: employeeId },
          select: { firstName: true, lastName: true, email: true },
        })
      }
      return employeeContact
    }

    return Promise.all(
      balances.map(async (balance) => {
        const rule = balance.leaveType.carryForwardRule
        let carryForwardExpiresAt: Date | null = null
        let carryForwardExpired = false

        if (rule?.expiresAfterDays != null && balance.carriedForwardDays > 0) {
          carryForwardExpiresAt = new Date(Date.UTC(year, 0, 1))
          carryForwardExpiresAt.setUTCDate(carryForwardExpiresAt.getUTCDate() + rule.expiresAfterDays)
          carryForwardExpired = rule.autoExpiryEnabled && now.getTime() > carryForwardExpiresAt.getTime()

          const daysUntilExpiry = Math.ceil((carryForwardExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          if (!carryForwardExpired && daysUntilExpiry >= 0 && daysUntilExpiry <= CARRY_FORWARD_EXPIRY_WARNING_DAYS) {
            await this.notificationsService.create({
              recipientEmployeeId: employeeId,
              type: NotificationType.LEAVE_CARRY_FORWARD_EXPIRING,
              title: "Carried-forward leave expiring soon",
              message: `${balance.carriedForwardDays} carried-forward day(s) of ${balance.leaveType.name} expire on ${carryForwardExpiresAt.toISOString().slice(0, 10)}.`,
              actionUrl: "/staff/leave",
            })
            const contact = await getEmployeeContact()
            if (contact) {
              await this.emailService.enqueue({
                templateKey: "leave_carry_forward_expiring",
                recipientEmail: contact.email,
                recipientEmployeeId: employeeId,
                relatedModule: "leave",
                relatedEntityId: balance.id,
                variables: {
                  employee_name: `${contact.firstName} ${contact.lastName}`,
                  leave_type: balance.leaveType.name,
                  carry_forward_days: balance.carriedForwardDays,
                  expiry_date: carryForwardExpiresAt.toISOString().slice(0, 10),
                  leave_url: buildClientUrl("/staff/leave"),
                },
              })
            }
          }
        }

        const effectiveCarriedForwardDays = carryForwardExpired ? 0 : balance.carriedForwardDays

        const remainingDays =
          balance.entitledDays + effectiveCarriedForwardDays + balance.adjustmentDays -
          balance.takenDays -
          balance.pendingDays

        if (remainingDays > 0 && remainingDays <= LOW_BALANCE_THRESHOLD_DAYS) {
          await this.notificationsService.create({
            recipientEmployeeId: employeeId,
            type: NotificationType.LOW_BALANCE,
            title: "Low leave balance",
            message: `Your remaining ${balance.leaveType.name} balance is now ${remainingDays} day(s).`,
            actionUrl: "/staff/leave",
          })
          const contact = await getEmployeeContact()
          if (contact) {
            await this.emailService.enqueue({
              templateKey: "leave_low_balance",
              recipientEmail: contact.email,
              recipientEmployeeId: employeeId,
              relatedModule: "leave",
              relatedEntityId: balance.id,
              variables: {
                employee_name: `${contact.firstName} ${contact.lastName}`,
                leave_type: balance.leaveType.name,
                balance_days: remainingDays,
                leave_url: buildClientUrl("/staff/leave"),
              },
            })
          }
        }

        return {
          ...balance,
          carryForwardExpiresAt,
          carryForwardExpired,
          remainingDays,
        }
      })
    )
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
   * (LeaveCarryForwardRule.expiresAfterDays) is not applied here — it's
   * computed on read by getSummary() instead, per the "computed on-demand,
   * no scheduler" design decision (see that method's doc comment).
   *
   * `exemptDepartmentIds`/`exemptEmployeeIds` are interpreted as exempting
   * that department/employee from the rule's `maxDays` cap specifically
   * (their full remaining balance carries forward uncapped) rather than
   * excluding them from carry-forward altogether — the spec doesn't say
   * which direction "exception" runs, and this reading (a named exception
   * to an otherwise-capped policy) is the more common real-world meaning.
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

      const employeeIds = balances.map((balance) => balance.employeeId)
      const employees =
        employeeIds.length > 0
          ? await this.prisma.employee.findMany({
              where: { employeeNumber: { in: employeeIds } },
              select: { employeeNumber: true, position: { select: { departmentId: true } } },
            })
          : []
      const departmentByEmployeeId = new Map(employees.map((employee) => [employee.employeeNumber, employee.position?.departmentId ?? null]))

      for (const balance of balances) {
        const remaining =
          balance.entitledDays + balance.carriedForwardDays + balance.adjustmentDays -
          balance.takenDays -
          balance.pendingDays

        if (remaining <= 0) continue

        const departmentId = departmentByEmployeeId.get(balance.employeeId) ?? null
        const isExempt =
          rule.exemptEmployeeIds.includes(balance.employeeId) ||
          (departmentId !== null && rule.exemptDepartmentIds.includes(departmentId))

        const carriedDays = !isExempt && rule.maxDays != null ? Math.min(remaining, rule.maxDays) : remaining

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
