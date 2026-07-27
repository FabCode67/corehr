import { Module } from "@nestjs/common"

import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { OffersController } from "./offers.controller"
import { OffersService } from "./offers.service"

@Module({
  imports: [RecruitmentAccessModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
