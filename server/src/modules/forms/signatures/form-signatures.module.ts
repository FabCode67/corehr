import { Module } from "@nestjs/common"

import { EmailModule } from "../../email/email.module"
import { NotificationsModule } from "../../leave/notifications/notifications.module"

import { FormSignaturesController } from "./form-signatures.controller"
import { FormSignaturesService } from "./form-signatures.service"

@Module({
  imports: [EmailModule, NotificationsModule],
  controllers: [FormSignaturesController],
  providers: [FormSignaturesService],
  exports: [FormSignaturesService],
})
export class FormSignaturesModule {}
