import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

/** Inline "create a brand new Position" payload — used instead of
 *  `positionId` when the requisition is for a role that doesn't exist yet
 *  on the org chart. See RequisitionsService.create. */
export class NewPositionDto {
  @MaxLength(150)
  @IsString()
  title!: string

  @IsUUID()
  departmentId!: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  unitId?: string

  @IsUUID()
  levelId!: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  reportsToPositionId?: string
}
