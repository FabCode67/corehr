import { Module } from "@nestjs/common"

import { EmployeesModule } from "../employees.module"
import { FormInstancesModule } from "../../forms/instances/form-instances.module"
import { EmailModule } from "../../email/email.module"

import { ExitProcessController } from "./exit-process.controller"
import { ExitProcessService } from "./exit-process.service"

@Module({
  imports: [EmployeesModule, FormInstancesModule, EmailModule],
  controllers: [ExitProcessController],
  providers: [ExitProcessService],
  exports: [ExitProcessService],
})
export class ExitProcessModule {}
