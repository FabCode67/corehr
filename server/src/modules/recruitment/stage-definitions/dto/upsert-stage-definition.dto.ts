import { ApiPropertyOptional } from "@nestjs/swagger"
import { RecruitmentStageType } from "@prisma/client"
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator"

/** Creates a new entry in HR's editable stage catalog — see the schema's
 *  doc comment on RecruitmentStageDefinition for why this exists instead of
 *  a fixed enum. `key` is a stable machine identifier (used by
 *  RecruitmentWorkflow seeding and anywhere code needs to reference a
 *  specific built-in stage) — required on create, immutable thereafter. */
export class CreateStageDefinitionDto {
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: "key must be UPPER_SNAKE_CASE, e.g. TECHNICAL_INTERVIEW" })
  key!: string

  @MaxLength(120)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(RecruitmentStageType)
  stageType!: RecruitmentStageType

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isScored?: boolean

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrderHint?: number

  @IsString()
  actingEmployeeId!: string
}

/** `key` is deliberately not editable here — see CreateStageDefinitionDto's
 *  doc comment. */
export class UpdateStageDefinitionDto {
  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsEnum(RecruitmentStageType)
  @IsOptional()
  stageType?: RecruitmentStageType

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isScored?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrderHint?: number

  @IsString()
  actingEmployeeId!: string
}
