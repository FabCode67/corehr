import { Module } from "@nestjs/common"

import { NotificationsModule } from "../../leave/notifications/notifications.module"
import { LearningAccessModule } from "../access/learning-access.module"
import { CoursesModule } from "../courses/courses.module"

import { AssignmentsController } from "./assignments.controller"
import { AssignmentsService } from "./assignments.service"

@Module({
  imports: [LearningAccessModule, CoursesModule, NotificationsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
