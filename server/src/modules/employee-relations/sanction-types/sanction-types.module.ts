import { Module } from "@nestjs/common"

import { SanctionTypesController } from "./sanction-types.controller"
import { SanctionTypesService } from "./sanction-types.service"

@Module({
  controllers: [SanctionTypesController],
  providers: [SanctionTypesService],
  exports: [SanctionTypesService],
})
export class SanctionTypesModule {}
