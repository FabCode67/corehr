import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { PrismaModule } from "./prisma/prisma.module"
import { OrganizationModule } from "./modules/organization/organization.module"
import { EmployeesModule } from "./modules/employees/employees.module"
import { UploadsModule } from "./modules/uploads/uploads.module"
import { AuthModule } from "./modules/auth/auth.module"
import { LeavePolicyModule } from "./modules/leave/leave-policy/leave-policy.module"
import { LeaveTypesModule } from "./modules/leave/leave-types/leave-types.module"
import { LeaveBalancesModule } from "./modules/leave/leave-balances/leave-balances.module"
import { NotificationsModule } from "./modules/leave/notifications/notifications.module"
import { LeaveRequestsModule } from "./modules/leave/leave-requests/leave-requests.module"
import { LeaveAnalyticsModule } from "./modules/leave/leave-analytics/leave-analytics.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OrganizationModule,
    EmployeesModule,
    UploadsModule,
    AuthModule,
    LeavePolicyModule,
    LeaveTypesModule,
    LeaveBalancesModule,
    NotificationsModule,
    LeaveRequestsModule,
    LeaveAnalyticsModule,
  ],
})
export class AppModule {}
