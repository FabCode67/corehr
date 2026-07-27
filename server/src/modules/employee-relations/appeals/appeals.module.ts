import { Module } from "@nestjs/common"

import { DisciplinaryCasesModule } from "../cases/disciplinary-cases.module"
import { EmployeeRelationsAccessModule } from "../access/employee-relations-access.module"

import { AppealsController } from "./appeals.controller"
import { AppealsService } from "./appeals.service"

@Module({
  imports: [DisciplinaryCasesModule, EmployeeRelationsAccessModule],
  controllers: [AppealsController],
  providers: [AppealsService],
  exports: [AppealsService],
})
export class AppealsModule {}
