import { Module } from "@nestjs/common"

import { UploadsModule } from "../../uploads/uploads.module"
import { ApplicationsModule } from "../applications/applications.module"

import { PublicJobsController } from "./public-jobs.controller"
import { PublicJobsService } from "./public-jobs.service"

@Module({
  imports: [UploadsModule, ApplicationsModule],
  controllers: [PublicJobsController],
  providers: [PublicJobsService],
})
export class PublicJobsModule {}
