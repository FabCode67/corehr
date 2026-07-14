import { ApiPropertyOptional } from "@nestjs/swagger"
import { ApprovalRole, Gender, LeaveCategory, LeaveEntitlementCategory } from "@prisma/client"
import { Type } from "class-transformer"
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from "class-validator"

export class CreateLeaveTypeDto {
  @MaxLength(80)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  code?: string

  @IsEnum(LeaveCategory)
  category!: LeaveCategory

  @ApiPropertyOptional({ description: "Whether taking this leave reduces Annual Leave balance." })
  @IsBoolean()
  @IsOptional()
  affectsAnnualBalance?: boolean

  @ApiPropertyOptional({ enum: Gender, description: "Restricts who can request this type." })
  @IsEnum(Gender)
  @IsOptional()
  genderRestriction?: Gender

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxDaysPerYear?: number

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresDocumentation?: boolean

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  documentationThresholdDays?: number

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresHrApproval?: boolean
}

export class UpdateLeaveTypeDto {
  @ApiPropertyOptional()
  @MaxLength(80)
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional({ enum: LeaveCategory })
  @IsEnum(LeaveCategory)
  @IsOptional()
  category?: LeaveCategory

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  affectsAnnualBalance?: boolean

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  genderRestriction?: Gender

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxDaysPerYear?: number

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresDocumentation?: boolean

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  documentationThresholdDays?: number

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresHrApproval?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class UpsertEntitlementRuleDto {
  @IsEnum(LeaveEntitlementCategory)
  employeeCategory!: LeaveEntitlementCategory

  @IsInt()
  @Min(0)
  days!: number
}

class ApprovalStepInput {
  @IsInt()
  @Min(1)
  order!: number

  @IsEnum(ApprovalRole)
  role!: ApprovalRole
}

export class ReplaceApprovalStepsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepInput)
  steps!: ApprovalStepInput[]
}

export class UpsertCarryForwardRuleDto {
  @IsBoolean()
  enabled!: boolean

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxDays?: number

  @ApiPropertyOptional({ description: "Carried-forward days expire this many days into the next year." })
  @IsInt()
  @Min(0)
  @IsOptional()
  expiresAfterDays?: number
}
