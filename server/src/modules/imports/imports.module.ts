import { Module } from "@nestjs/common"

import { EmployeesModule } from "../employees/employees.module"
import { NotificationsModule } from "../leave/notifications/notifications.module"

import { ImportsController } from "./imports.controller"
import { ImportsService } from "./imports.service"

/**
 * Only depends on EmployeesModule (for the Employee/Exit import modules'
 * reuse of real business logic) and NotificationsModule (for the
 * best-effort "import completed" admin notification). Every other module
 * config in registry/*.config.ts writes directly via the row-scoped
 * transaction ImportsService opens, so no other module import is needed
 * here — see registry/types.ts's ImportDeps doc comment.
 */
@Module({
  imports: [EmployeesModule, NotificationsModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
