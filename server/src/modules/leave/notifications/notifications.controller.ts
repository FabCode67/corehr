import { Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { NotificationsService } from "./notifications.service"

@ApiTags("Leave / Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("employee/:employeeId")
  findForEmployee(
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Query("unreadOnly") unreadOnly?: string
  ) {
    return this.notificationsService.findForEmployee(employeeId, unreadOnly === "true")
  }

  @Patch(":id/read")
  markRead(@Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(id)
  }

  @Post("employee/:employeeId/read-all")
  markAllRead(@Param("employeeId", ParseUUIDPipe) employeeId: string) {
    return this.notificationsService.markAllRead(employeeId)
  }
}
