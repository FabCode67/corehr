import { PartialType } from "@nestjs/swagger"

import { CreateWorkforcePlanDto } from "./create-workforce-plan.dto"

export class UpdateWorkforcePlanDto extends PartialType(CreateWorkforcePlanDto) {}
