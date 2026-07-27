import { Module } from "@nestjs/common"

import { DisciplinaryCasesModule } from "../cases/disciplinary-cases.module"

import { CasePdfController } from "./case-pdf.controller"
import { CasePdfService } from "./case-pdf.service"

@Module({
  imports: [DisciplinaryCasesModule],
  controllers: [CasePdfController],
  providers: [CasePdfService],
  exports: [CasePdfService],
})
export class CasePdfModule {}
