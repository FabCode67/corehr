import { Module } from "@nestjs/common"

import { EmployeesModule } from "../../employees/employees.module"
import { EmployeeRelationsAccessModule } from "../access/employee-relations-access.module"

import { DisciplinaryCasesController } from "./disciplinary-cases.controller"
import { DisciplinaryCasesService } from "./disciplinary-cases.service"

@Module({
  imports: [EmployeeRelationsAccessModule, EmployeesModule],
  controllers: [DisciplinaryCasesController],
  providers: [DisciplinaryCasesService],
  exports: [DisciplinaryCasesService],
})
export class DisciplinaryCasesModule {}
