import { ApiPropertyOptional } from "@nestjs/swagger"
import { ContractType, CourseDeliveryMethod } from "@prisma/client"
import { Type } from "class-transformer"
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator"

export class CreateCourseDto {
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @IsUUID()
  categoryId!: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  institutionId?: string

  /// Legacy — no longer collected by the New Course form (see isBudgeted/
  /// memoUrl below), kept optional so historical rows and the Cost
  /// Analysis reports/AI tool that already key off it keep working.
  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  cost?: number

  @ApiPropertyOptional({ description: "Whether this course's cost is already covered by an approved budget." })
  @IsBoolean()
  @IsOptional()
  isBudgeted?: boolean

  @ApiPropertyOptional({ description: "Justification memo URL — expected when isBudgeted is false." })
  @IsString()
  @IsOptional()
  memoUrl?: string

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  durationHours?: number

  @IsEnum(CourseDeliveryMethod)
  deliveryMethod!: CourseDeliveryMethod

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date

  // --- Eligibility restrictions (all optional) -----------------------------
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredFunctionId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredDepartmentId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredUnitId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredPositionId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredLevelId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredBandId?: string

  @ApiPropertyOptional()
  @IsEnum(ContractType)
  @IsOptional()
  requiredContractType?: ContractType

  @ApiPropertyOptional({
    description: "When true, every eligible employee gets this course auto-assigned the first time their employment start date is set.",
  })
  @IsBoolean()
  @IsOptional()
  autoAssignOnHire?: boolean

  @ApiPropertyOptional({ description: "Deadline = employment start date + this many months. Defaults to 12 when autoAssignOnHire is true and this is left unset." })
  @IsInt()
  @Min(1)
  @IsOptional()
  autoAssignDueMonths?: number

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
