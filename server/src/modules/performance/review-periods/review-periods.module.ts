import { Module } from "@nestjs/common"

import { EmailModule } from "../../email/email.module"

import { ReviewPeriodsController } from "./review-periods.controller"
import { ReviewPeriodsService } from "./review-periods.service"
import { PerformanceReminderScheduler } from "./performance-reminder.scheduler"

@Module({
  imports: [EmailModule],
  controllers: [ReviewPeriodsController],
  providers: [ReviewPeriodsService, PerformanceReminderScheduler],
  exports: [ReviewPeriodsService],
})
export class ReviewPeriodsModule {}
