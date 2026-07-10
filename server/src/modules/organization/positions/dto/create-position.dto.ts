import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

export class CreatePositionDto {
  @MaxLength(150)
  @IsString()
  title!: string

  @IsUUID()
  departmentId!: string

  /** Omit when the department has no units — the position attaches directly to the department. */
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  unitId?: string

  @IsUUID()
  levelId!: string

  /** Omit only for the single root of the org tree (e.g. Managing Director). */
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  reportsToPositionId?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
