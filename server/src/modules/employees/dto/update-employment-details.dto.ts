import { ApiPropertyOptional } from "@nestjs/swagger"
import { ContractType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator"

/**
 * Step 2 of the Employee Registration wizard — Employment Details. Entirely
 * optional, and every field here is independently optional too (the wizard
 * lets this step be skipped or partially filled in). Client-side validation
 * enforces the conditional "if Previous Employee = Yes, these fields are
 * required" rule from the spec — the server stays permissive so a partial
 * save (leave and resume later) always succeeds.
 */
export class UpdateEmploymentDetailsDto {
  @ApiPropertyOptional({ enum: ContractType })
  @IsEnum(ContractType)
  @IsOptional()
  contractType?: ContractType

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  employmentStartDate?: Date

  @ApiPropertyOptional({
    description:
      "Mandatory for PERMANENT contracts — auto-defaults to employmentStartDate + 3 months when left unset; extend later by sending a new value.",
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  probationEndDate?: Date

  @ApiPropertyOptional({ description: "Contract end date, for TEMPORARY contracts." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  contractEndDate?: Date

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  previousEmployee?: boolean

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  previousEmployeeNumber?: string

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  previousPositionHeld?: string

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  previousDepartment?: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  previousExitDate?: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  previousReasonForLeaving?: string
}
