import { Module } from "@nestjs/common"

import { NotificationsModule } from "../../leave/notifications/notifications.module"
import { EmailModule } from "../../email/email.module"
import { LearningAccessModule } from "../access/learning-access.module"
import { CoursesModule } from "../courses/courses.module"

import { AssignmentsController } from "./assignments.controller"
import { AssignmentsService } from "./assignments.service"
import { LearningReminderScheduler } from "./learning-reminder.scheduler"

@Module({
  imports: [LearningAccessModule, CoursesModule, NotificationsModule, EmailModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, LearningReminderScheduler],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
