import { Module } from "@nestjs/common"

import { DisciplinaryCasesModule } from "../cases/disciplinary-cases.module"
import { NotificationsModule } from "../../leave/notifications/notifications.module"
import { EmployeeRelationsAccessModule } from "../access/employee-relations-access.module"

import { SanctionsController } from "./sanctions.controller"
import { SanctionsService } from "./sanctions.service"

@Module({
  imports: [DisciplinaryCasesModule, EmployeeRelationsAccessModule, NotificationsModule],
  controllers: [SanctionsController],
  providers: [SanctionsService],
  exports: [SanctionsService],
})
export class SanctionsModule {}
