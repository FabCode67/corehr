import { ApiPropertyOptional } from "@nestjs/swagger"
import { ContractType, RecruitmentEmploymentType, RecruitmentPriority } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsInt, IsOptional, IsUUID, Min } from "class-validator"

/** Fields that make sense to edit after creation. Position, workforce plan,
 *  and the department/unit/function snapshot derived from the position stay
 *  fixed (create a new requisition instead if the role itself changes) —
 *  band, contract type, and employment type are plain requisition-level
 *  choices rather than position-derived, so they're editable like the rest. */
export class UpdateRequisitionDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  bandId?: string

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfVacancies?: number

  @ApiPropertyOptional()
  @IsEnum(ContractType)
  @IsOptional()
  contractType?: ContractType

  @ApiPropertyOptional()
  @IsEnum(RecruitmentEmploymentType)
  @IsOptional()
  employmentType?: RecruitmentEmploymentType

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
