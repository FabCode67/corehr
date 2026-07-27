import { ApiPropertyOptional } from "@nestjs/swagger"
import { ContractType, HiringReason, RecruitmentEmploymentType, RecruitmentPriority } from "@prisma/client"
import { Type } from "class-transformer"
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator"

import { NewPositionDto } from "./new-position.dto"

/**
 * Exactly one of `positionId` (an existing Position) or `newPosition` (a
 * brand-new one, created inline via PositionsService) must be supplied —
 * enforced in RequisitionsService.create rather than a class-validator
 * group, since "exactly one of two optional fields" isn't expressible
 * declaratively without a custom validator.
 */
export class CreateRequisitionDto {
  @IsUUID()
  workforcePlanId!: string

  @ApiPropertyOptional({ description: "An existing Position's id. Omit if supplying newPosition instead." })
  @IsUUID()
  @IsOptional()
  positionId?: string

  @ApiPropertyOptional({ description: "Create a brand-new Position inline. Omit if supplying positionId instead." })
  @ValidateNested()
  @Type(() => NewPositionDto)
  @IsOptional()
  newPosition?: NewPositionDto

  @IsUUID()
  bandId!: string

  @IsInt()
  @Min(1)
  numberOfVacancies!: number

  @IsEnum(ContractType)
  contractType!: ContractType

  @IsUUID()
  branchId!: string

  @IsEnum(RecruitmentEmploymentType)
  employmentType!: RecruitmentEmploymentType

  @IsEnum(HiringReason)
  hiringReason!: HiringReason

  @IsString()
  requestedById!: string

  @IsString()
  hiringManagerId!: string

  @ApiPropertyOptional()
  @IsEnum(RecruitmentPriority)
  @IsOptional()
  priority?: RecruitmentPriority

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  targetStartDate?: Date

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  jobDescriptionId?: string
}
