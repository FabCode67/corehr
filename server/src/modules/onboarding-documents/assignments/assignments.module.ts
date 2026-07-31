import { Module } from "@nestjs/common"

import { NotificationsModule } from "../../leave/notifications/notifications.module"

import { AssignmentsController } from "./assignments.controller"
import { AssignmentsService } from "./assignments.service"

@Module({
  imports: [NotificationsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
