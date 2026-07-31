import { Body, Controller, Get, Param, Patch } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto"
import { NotificationPreferencesService } from "./notification-preferences.service"

@ApiTags("Email / Notification Preferences")
@Controller("notification-preferences")
export class NotificationPreferencesController {
  constructor(private readonly notificationPreferencesService: NotificationPreferencesService) {}

  @Get("employee/:employeeId")
  findOrCreate(@Param("employeeId") employeeId: string) {
    return this.notificationPreferencesService.findOrCreate(employeeId)
  }

  @Patch("employee/:employeeId")
  update(@Param("employeeId") employeeId: string, @Body() dto: UpdateNotificationPreferenceDto) {
    return this.notificationPreferencesService.update(employeeId, dto)
  }
}
