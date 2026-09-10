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

  /** Optional — if omitted, PositionsService auto-defaults this to the
   *  bank's single Director-level position (the org's head), if one
   *  exists. Leave it omitted on the Director-level position itself; it's
   *  the one position that never reports to anyone. */
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  reportsToPositionId?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
