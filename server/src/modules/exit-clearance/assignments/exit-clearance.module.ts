import { Module } from "@nestjs/common"

import { EmailModule } from "../../email/email.module"
import { NotificationsModule } from "../../leave/notifications/notifications.module"

import { ExitClearanceController } from "./exit-clearance.controller"
import { ExitClearanceReminderScheduler } from "./exit-clearance-reminder.scheduler"
import { ExitClearanceService } from "./exit-clearance.service"

@Module({
  imports: [NotificationsModule, EmailModule],
  controllers: [ExitClearanceController],
  providers: [ExitClearanceService, ExitClearanceReminderScheduler],
  exports: [ExitClearanceService],
})
export class ExitClearanceModule {}
