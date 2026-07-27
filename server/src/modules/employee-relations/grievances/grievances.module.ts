import { Module } from "@nestjs/common"

import { EmployeeRelationsAccessModule } from "../access/employee-relations-access.module"

import { GrievancesController } from "./grievances.controller"
import { GrievancesService } from "./grievances.service"

@Module({
  imports: [EmployeeRelationsAccessModule],
  controllers: [GrievancesController],
  providers: [GrievancesService],
  exports: [GrievancesService],
})
export class GrievancesModule {}
