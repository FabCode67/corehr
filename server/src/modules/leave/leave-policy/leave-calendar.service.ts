import { Injectable } from "@nestjs/common"
import { PublicHoliday } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

import { LeaveSettingsService } from "./leave-settings.service"

export interface LeaveDayComputation {
  numberOfDays: number
  returnDate: Date
}

/**
 * Turns a start/end date range into an actual leave-day count and return
 * date, honoring the bank's configurable weekend/holiday exclusion rules
 * (LeaveSettings + PublicHoliday) — nothing here is hardcoded to Sat/Sun or
 * a fixed holiday list. Used by LeaveRequestsService both to validate a
 * request and to power the live "days" preview in the request form.
 *
 * All date math is done in UTC (getUTCDay/getUTCMonth/getUTCDate) since
 * Prisma returns `@db.Date` columns as UTC-midnight JS Dates — mixing in
 * local-timezone getters here would silently shift results by a day
 * depending on the server's timezone.
 */
@Injectable()
export class LeaveCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveSettingsService: LeaveSettingsService
  ) {}

  async compute(startDate: Date, endDate: Date): Promise<LeaveDayComputation> {
    const settings = await this.leaveSettingsService.get()
    const holidays = settings.excludePublicHolidays
      ? await this.prisma.publicHoliday.findMany({ where: { isActive: true } })
      : []

    let numberOfDays = 0
    const cursor = new Date(startDate)
    while (cursor.getTime() <= endDate.getTime()) {
      if (this.isLeaveDay(cursor, settings.weekendDays, settings.excludeWeekends, holidays)) {
        numberOfDays += 1
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    const returnDate = new Date(endDate)
    do {
      returnDate.setUTCDate(returnDate.getUTCDate() + 1)
    } while (!this.isLeaveDay(returnDate, settings.weekendDays, settings.excludeWeekends, holidays))

    return { numberOfDays, returnDate }
  }

  private isLeaveDay(
    date: Date,
    weekendDays: number[],
    excludeWeekends: boolean,
    holidays: PublicHoliday[]
  ): boolean {
    if (excludeWeekends && weekendDays.includes(date.getUTCDay())) {
      return false
    }
    if (this.isHoliday(date, holidays)) {
      return false
    }
    return true
  }

  private isHoliday(date: Date, holidays: PublicHoliday[]): boolean {
    return holidays.some((holiday) => {
      if (holiday.isRecurringAnnually) {
        return (
          holiday.date.getUTCMonth() === date.getUTCMonth() &&
          holiday.date.getUTCDate() === date.getUTCDate()
        )
      }
      return (
        holiday.date.getUTCFullYear() === date.getUTCFullYear() &&
        holiday.date.getUTCMonth() === date.getUTCMonth() &&
        holiday.date.getUTCDate() === date.getUTCDate()
      )
    })
  }
}
