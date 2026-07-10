import { PartialType, OmitType } from "@nestjs/swagger"

import { CreateEmployeeDto } from "./create-employee.dto"

/**
 * Basic-fields update only. Position and Band changes go through
 * TransferEmployeeDto / ChangeBandDto instead, so every change is captured
 * in PositionHistory rather than silently overwritten.
 */
export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ["positionId", "bandId"] as const)
) {}
