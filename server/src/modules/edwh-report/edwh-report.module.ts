import { Module } from "@nestjs/common"

import { EdwhReportController } from "./edwh-report.controller"
import { EdwhReportService } from "./edwh-report.service"

/** BNR/EDWH regulatory export — see EdwhReportService's doc comment for the
 *  column spec and what's genuinely derivable today vs. left blank. */
@Module({
  controllers: [EdwhReportController],
  providers: [EdwhReportService],
})
export class EdwhReportModule {}
