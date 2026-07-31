import { Module } from "@nestjs/common"

import { LeaveBalancesModule } from "../leave-balances/leave-balances.module"
import { LeavePolicyModule } from "../leave-policy/leave-policy.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { EmailModule } from "../../email/email.module"

import { LeaveRequestsController } from "./leave-requests.controller"
import { LeaveRequestsService } from "./leave-requests.service"

@Module({
  imports: [LeaveBalancesModule, LeavePolicyModule, NotificationsModule, EmailModule],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
