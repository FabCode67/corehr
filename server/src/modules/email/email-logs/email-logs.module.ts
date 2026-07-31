import { Module } from "@nestjs/common"

import { EmailLogsController } from "./email-logs.controller"
import { EmailLogsService } from "./email-logs.service"

@Module({
  controllers: [EmailLogsController],
  providers: [EmailLogsService],
  exports: [EmailLogsService],
})
export class EmailLogsModule {}
