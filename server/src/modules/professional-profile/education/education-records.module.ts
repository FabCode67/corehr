import { Module } from "@nestjs/common"

import { EmailModule } from "../../email/email.module"

import { EducationRecordsController } from "./education-records.controller"
import { EducationRecordsService } from "./education-records.service"

@Module({
  imports: [EmailModule],
  controllers: [EducationRecordsController],
  providers: [EducationRecordsService],
  exports: [EducationRecordsService],
})
export class EducationRecordsModule {}
