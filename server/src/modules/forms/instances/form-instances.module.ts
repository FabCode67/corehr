import { Module } from "@nestjs/common"

import { EmployeesModule } from "../../employees/employees.module"
import { NotificationsModule } from "../../leave/notifications/notifications.module"
import { FormsAccessModule } from "../access/forms-access.module"

import { FormInstancesController } from "./form-instances.controller"
import { FormInstancesService } from "./form-instances.service"

@Module({
  imports: [FormsAccessModule, EmployeesModule, NotificationsModule],
  controllers: [FormInstancesController],
  providers: [FormInstancesService],
  exports: [FormInstancesService],
})
export class FormInstancesModule {}
