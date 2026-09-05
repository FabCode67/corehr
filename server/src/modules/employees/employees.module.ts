import { Module } from "@nestjs/common"

import { EmailModule } from "../email/email.module"
import { LeaveBalancesModule } from "../leave/leave-balances/leave-balances.module"
import { NotificationsModule } from "../leave/notifications/notifications.module"
import { AssignmentsModule } from "../learning/assignments/assignments.module"

import { ContractReminderScheduler } from "./contract-reminder.scheduler"
import { EmployeesController } from "./employees.controller"
import { EmployeesExportService } from "./employees-export.service"
import { EmployeesService } from "./employees.service"
import { FamilyTreePdfService } from "./family-tree-pdf.service"
import { ProbationReminderScheduler } from "./probation-reminder.scheduler"

@Module({
  imports: [LeaveBalancesModule, AssignmentsModule, EmailModule, NotificationsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesExportService, FamilyTreePdfService, ProbationReminderScheduler, ContractReminderScheduler],
  exports: [EmployeesService],
})
export class EmployeesModule {}
