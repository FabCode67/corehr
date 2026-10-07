import { Module } from "@nestjs/common"

import { EmailModule } from "../../email/email.module"
import { NotificationsModule } from "../../leave/notifications/notifications.module"
import { InstitutionsModule } from "../institutions/institutions.module"

import { CertificationsController } from "./certifications.controller"
import { CertificationsService } from "./certifications.service"

@Module({
  imports: [EmailModule, NotificationsModule, InstitutionsModule],
  controllers: [CertificationsController],
  providers: [CertificationsService],
  exports: [CertificationsService],
})
export class CertificationsModule {}
