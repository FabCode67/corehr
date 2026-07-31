import { PartialType, OmitType } from "@nestjs/swagger"

import { CreateCertificationDto } from "./create-certification.dto"

export class UpdateCertificationDto extends PartialType(OmitType(CreateCertificationDto, ["employeeId"] as const)) {}
