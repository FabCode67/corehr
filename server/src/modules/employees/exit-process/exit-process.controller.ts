import { Body, Controller, Get, Param, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ExitProcessService } from "./exit-process.service"
import { InitiateExitDto } from "./dto/initiate-exit.dto"

/** Registers additional routes under the existing "employees" path prefix
 *  (alongside EmployeesController, in a different module — Nest merges
 *  controllers from different modules onto the same global router as long
 *  as no two declare the identical method+path). Kept as its own
 *  controller/module rather than added to EmployeesController because it
 *  needs FormInstancesService — see ExitProcessService's doc comment for
 *  why that can't live in EmployeesModule directly. */
@ApiTags("Employees / Exit Process")
@Controller("employees")
export class ExitProcessController {
  constructor(private readonly exitProcessService: ExitProcessService) {}

  @Post(":id/initiate-exit")
  initiateExit(@Param("id") id: string, @Body() dto: InitiateExitDto) {
    return this.exitProcessService.initiateExit(id, dto.actingEmployeeId)
  }

  @Get(":id/exit-form-status")
  getExitFormStatus(@Param("id") id: string) {
    return this.exitProcessService.getExitFormStatus(id)
  }
}
