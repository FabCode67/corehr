import { ApiPropertyOptional } from "@nestjs/swagger"
import { ApprovalDecision } from "@prisma/client"
import { Type } from "class-transformer"
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateLeaveRequestDto {
  @IsUUID()
  employeeId!: string

  @IsUUID()
  leaveTypeId!: string

  @Type(() => Date)
  @IsDate()
  startDate!: Date

  @Type(() => Date)
  @IsDate()
  endDate!: Date

  @ApiPropertyOptional({ description: "Auto-calculated if omitted; pass to override." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  returnDate?: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string

  @ApiPropertyOptional({ description: "Cloudinary URL, set via POST /uploads first." })
  @IsString()
  @IsOptional()
  attachmentUrl?: string

  @ApiPropertyOptional({ description: "Employee acting in this employee's stead while away." })
  @IsUUID()
  @IsOptional()
  delegateEmployeeId?: string

  @ApiPropertyOptional({
    description: "Proceed even if this would take the balance negative (HR use only).",
  })
  @IsBoolean()
  @IsOptional()
  hrOverride?: boolean
}

export class PreviewLeaveDaysDto {
  @Type(() => Date)
  @IsDate()
  startDate!: Date

  @Type(() => Date)
  @IsDate()
  endDate!: Date
}

export class DecideApprovalDto {
  @IsEnum(ApprovalDecision)
  decision!: ApprovalDecision

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string

  @ApiPropertyOptional({
    description: "The employee acting as approver, if known (e.g. the resolved line manager).",
  })
  @IsUUID()
  @IsOptional()
  actingEmployeeId?: string
}
