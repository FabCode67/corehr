import { PartialType } from "@nestjs/swagger"

import { CreateEmployeeDto } from "./create-employee.dto"

/**
 * Basic-fields update only (Step 1, revisited later). Position and Band
 * changes go through the position-assignment / transfer / band endpoints
 * instead, so every change is captured in PositionHistory rather than
 * silently overwritten.
 */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
