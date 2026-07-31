import { Module } from "@nestjs/common"

import { EmailModule } from "../../email/email.module"

import { FormSignaturesController } from "./form-signatures.controller"
import { FormSignaturesService } from "./form-signatures.service"

@Module({
  imports: [EmailModule],
  controllers: [FormSignaturesController],
  providers: [FormSignaturesService],
  exports: [FormSignaturesService],
})
export class FormSignaturesModule {}
