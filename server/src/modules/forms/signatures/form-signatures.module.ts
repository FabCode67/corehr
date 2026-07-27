import { Module } from "@nestjs/common"

import { FormSignaturesController } from "./form-signatures.controller"
import { FormSignaturesService } from "./form-signatures.service"

@Module({
  controllers: [FormSignaturesController],
  providers: [FormSignaturesService],
  exports: [FormSignaturesService],
})
export class FormSignaturesModule {}
