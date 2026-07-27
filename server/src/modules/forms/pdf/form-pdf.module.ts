import { Module } from "@nestjs/common"

import { FormInstancesModule } from "../instances/form-instances.module"

import { FormPdfController } from "./form-pdf.controller"
import { FormPdfService } from "./form-pdf.service"

@Module({
  imports: [FormInstancesModule],
  controllers: [FormPdfController],
  providers: [FormPdfService],
  exports: [FormPdfService],
})
export class FormPdfModule {}
