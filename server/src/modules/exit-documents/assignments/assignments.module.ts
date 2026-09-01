import { Module } from "@nestjs/common"

import { NotificationsModule } from "../../leave/notifications/notifications.module"

import { ExitDocumentAssignmentsController } from "./assignments.controller"
import { ExitDocumentAssignmentsService } from "./assignments.service"

@Module({
  imports: [NotificationsModule],
  controllers: [ExitDocumentAssignmentsController],
  providers: [ExitDocumentAssignmentsService],
  exports: [ExitDocumentAssignmentsService],
})
export class ExitDocumentAssignmentsModule {}
