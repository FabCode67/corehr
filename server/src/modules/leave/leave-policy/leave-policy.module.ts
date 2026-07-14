import { Module } from "@nestjs/common"

import { LeaveCalendarService } from "./leave-calendar.service"
import { LeaveSettingsController } from "./leave-settings.controller"
import { LeaveSettingsService } from "./leave-settings.service"
import { PublicHolidaysController } from "./public-holidays.controller"
import { PublicHolidaysService } from "./public-holidays.service"

/**
 * Public Holidays + Leave Settings (weekend/working-day config) + the
 * LeaveCalendarService that combines both into actual leave-day math.
 * Grouped into one module since they're small and tightly related.
 */
@Module({
  controllers: [PublicHolidaysController, LeaveSettingsController],
  providers: [PublicHolidaysService, LeaveSettingsService, LeaveCalendarService],
  exports: [PublicHolidaysService, LeaveSettingsService, LeaveCalendarService],
})
export class LeavePolicyModule {}
