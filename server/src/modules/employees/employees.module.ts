import { Module } from "@nestjs/common"

import { LeaveBalancesModule } from "../leave/leave-balances/leave-balances.module"
import { AssignmentsModule } from "../learning/assignments/assignments.module"
import { EmailModule } from "../email/email.module"

import { EmployeesController } from "./employees.controller"
import { EmployeesService } from "./employees.service"

@Module({
  imports: [LeaveBalancesModule, AssignmentsModule, EmailModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
