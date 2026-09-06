import { ApiPropertyOptional } from "@nestjs/swagger"
import { RecruitmentEmploymentType, RecruitmentPriority } from "@prisma/client"
import { Type } from "class-transformer"
import { IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator"

export class CreateWorkforcePlanDto {
  @IsString()
  title!: string

  @IsUUID()
  departmentId!: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  unitId?: string

  @IsUUID()
  branchId!: string

  @IsString()
  hiringManagerId!: string

  @IsString()
  recruiterId!: string

  @IsInt()
  @Min(1)
  numberOfPositions!: number

  @IsEnum(RecruitmentEmploymentType)
  employmentType!: RecruitmentEmploymentType

  @ApiPropertyOptional()
  @IsEnum(RecruitmentPriority)
  @IsOptional()
  priority?: RecruitmentPriority

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  expectedHiringDate?: Date

  @IsString()
  businessJustification!: string

  // Legacy numeric field — superseded by isBudgeted/memoUrl below for new
  // plans, but kept for historical data and the Budget by Department report.
  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  budget?: number

  @ApiPropertyOptional({ description: "Whether this workforce plan's cost is already covered by an approved budget." })
  @IsBoolean()
  @IsOptional()
  isBudgeted?: boolean

  @ApiPropertyOptional({ description: "Justification memo URL — expected when isBudgeted is false." })
  @IsString()
  @IsOptional()
  memoUrl?: string
}
