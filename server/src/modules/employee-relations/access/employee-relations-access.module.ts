import { Module } from "@nestjs/common"

import { EmployeeRelationsAccessService } from "./employee-relations-access.service"

@Module({
  providers: [EmployeeRelationsAccessService],
  exports: [EmployeeRelationsAccessService],
})
export class EmployeeRelationsAccessModule {}
