import { PartialType } from "@nestjs/swagger"

import { CreateSanctionTypeDto } from "./create-sanction-type.dto"

export class UpdateSanctionTypeDto extends PartialType(CreateSanctionTypeDto) {}
