import { Module } from "@nestjs/common"

import { EmployeesModule } from "../../employees/employees.module"
import { RecruitmentAccessModule } from "../access/recruitment-access.module"

import { OnboardingController } from "./onboarding.controller"
import { OnboardingService } from "./onboarding.service"

@Module({
  imports: [RecruitmentAccessModule, EmployeesModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
