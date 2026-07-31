import { Controller, Get, Param, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { EmailLogsService } from "./email-logs.service"

@ApiTags("Email / History")
@Controller("email-logs")
export class EmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) {}

  @Get()
  findAll(
    @Query("status") status?: string,
    @Query("relatedModule") relatedModule?: string,
    @Query("recipientEmployeeId") recipientEmployeeId?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.emailLogsService.findAll({
      status,
      relatedModule,
      recipientEmployeeId,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }

  @Get("stats")
  stats() {
    return this.emailLogsService.stats()
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.emailLogsService.findOne(id)
  }

  @Post(":id/retry")
  retry(@Param("id") id: string) {
    return this.emailLogsService.retry(id)
  }
}
