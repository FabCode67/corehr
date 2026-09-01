import { ApiPropertyOptional } from "@nestjs/swagger"
import { ContractType } from "@prisma/client"
import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator"

export class CreateWorkflowDto {
  @MaxLength(120)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean

  @ApiPropertyOptional()
  @Min(1)
  @Max(20)
  @IsInt()
  @IsOptional()
  minBandRank?: number

  @ApiPropertyOptional()
  @Min(1)
  @Max(20)
  @IsInt()
  @IsOptional()
  maxBandRank?: number

  @ApiPropertyOptional({ enum: ContractType, isArray: true })
  @IsEnum(ContractType, { each: true })
  @IsArray()
  @IsOptional()
  contractTypes?: ContractType[]

  @IsString()
  actingEmployeeId!: string
}

export class UpdateWorkflowDto {
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
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional()
  @Min(1)
  @Max(20)
  @IsInt()
  @IsOptional()
  minBandRank?: number

  @ApiPropertyOptional()
  @Min(1)
  @Max(20)
  @IsInt()
  @IsOptional()
  maxBandRank?: number

  @ApiPropertyOptional({ enum: ContractType, isArray: true })
  @IsEnum(ContractType, { each: true })
  @IsArray()
  @IsOptional()
  contractTypes?: ContractType[]

  @IsString()
  actingEmployeeId!: string
}

/** Replaces a workflow's full ordered stage list in one call — same
 *  "rebuild from scratch" idiom as seedRecruitmentStageEngine(), simplest
 *  way to let the admin UI submit a drag-reordered checklist without
 *  reasoning about partial diffs. */
export class SetWorkflowStagesDto {
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  @IsArray()
  stageIds!: string[]

  @IsString()
  actingEmployeeId!: string
}
