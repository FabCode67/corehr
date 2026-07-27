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

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  cost?: number

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
