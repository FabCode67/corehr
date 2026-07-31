import { Module } from "@nestjs/common"

import { EmailModule } from "../../email/email.module"

import { CertificationsController } from "./certifications.controller"
import { CertificationsService } from "./certifications.service"

@Module({
  imports: [EmailModule],
  controllers: [CertificationsController],
  providers: [CertificationsService],
  exports: [CertificationsService],
})
export class CertificationsModule {}
