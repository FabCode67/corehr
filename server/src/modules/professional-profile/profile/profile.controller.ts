import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { UpdateProfileSummaryDto } from "./dto/update-profile-summary.dto"
import { ProfileService } from "./profile.service"

@ApiTags("Professional Profile")
@Controller("professional-profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(":employeeId")
  getFullProfile(@Param("employeeId") employeeId: string, @Query("viewerEmployeeId") viewerEmployeeId?: string) {
    return this.profileService.getFullProfile(employeeId, viewerEmployeeId)
  }

  @Patch(":employeeId/summary")
  updateSummary(@Param("employeeId") employeeId: string, @Body() dto: UpdateProfileSummaryDto) {
    return this.profileService.updateSummary(employeeId, dto)
  }
}
