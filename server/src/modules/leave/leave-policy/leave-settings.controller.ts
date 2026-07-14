import { Body, Controller, Get, Patch } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { UpdateLeaveSettingsDto } from "./dto/leave-policy.dto"
import { LeaveSettingsService } from "./leave-settings.service"

@ApiTags("Leave / Settings")
@Controller("leave/settings")
export class LeaveSettingsController {
  constructor(private readonly leaveSettingsService: LeaveSettingsService) {}

  @Get()
  get() {
    return this.leaveSettingsService.get()
  }

  @Patch()
  update(@Body() dto: UpdateLeaveSettingsDto) {
    return this.leaveSettingsService.update(dto)
  }
}
