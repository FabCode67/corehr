import { Module } from "@nestjs/common"

import { DisciplinaryCasesModule } from "../cases/disciplinary-cases.module"

import { InvestigationsController } from "./investigations.controller"
import { InvestigationsService } from "./investigations.service"

@Module({
  imports: [DisciplinaryCasesModule],
  controllers: [InvestigationsController],
  providers: [InvestigationsService],
  exports: [InvestigationsService],
})
export class InvestigationsModule {}
