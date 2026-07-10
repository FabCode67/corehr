import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { PrismaModule } from "./prisma/prisma.module"
import { OrganizationModule } from "./modules/organization/organization.module"
import { EmployeesModule } from "./modules/employees/employees.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OrganizationModule,
    EmployeesModule,
  ],
})
export class AppModule {}
