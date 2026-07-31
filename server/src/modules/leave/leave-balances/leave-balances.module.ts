import { Module } from "@nestjs/common"

import { NotificationsModule } from "../notifications/notifications.module"
import { EmailModule } from "../../email/email.module"

import { LeaveBalancesController } from "./leave-balances.controller"
import { LeaveBalancesService } from "./leave-balances.service"

@Module({
  imports: [NotificationsModule, EmailModule],
  controllers: [LeaveBalancesController],
  providers: [LeaveBalancesService],
  exports: [LeaveBalancesService],
})
export class LeaveBalancesModule {}
