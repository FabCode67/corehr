import { Module } from "@nestjs/common"

import { RecruitmentAccessService } from "./recruitment-access.service"

@Module({
  providers: [RecruitmentAccessService],
  exports: [RecruitmentAccessService],
})
export class RecruitmentAccessModule {}
