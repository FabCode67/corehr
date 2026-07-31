import { ApiPropertyOptional } from "@nestjs/swagger"
import { ApprovalDecision } from "@prisma/client"
import { Type } from "class-transformer"
import { IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from "class-validator"

/** One uploaded file against a named LeaveAttachmentRequirement (e.g.
 *  "Medical Certificate" for Sick Leave) — distinct from the older, generic
 *  `attachmentUrl` field below (which backs the pre-existing
 *  requiresDocumentation/documentationThresholdDays "needs proof past N
 *  days" rule). HR configures which named requirements exist per leave
 *  type via LeaveAttachmentRequirement CRUD. */
export class LeaveRequestAttachmentInputDto {
  @IsUUID()
  requirementId!: string

  @IsString()
  fileUrl!: string
}

export class CreateLeaveRequestDto {
  @IsString()
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

  @IsString()
  @MinLength(3, { message: "Please provide a reason for this leave request." })
  reason!: string

  @ApiPropertyOptional({ description: "Cloudinary URL, set via POST /uploads first." })
  @IsString()
  @IsOptional()
  attachmentUrl?: string

  @ApiPropertyOptional({
    type: [LeaveRequestAttachmentInputDto],
    description: "One entry per HR-configured named attachment requirement for this leave type (e.g. Medical Certificate).",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaveRequestAttachmentInputDto)
  @IsOptional()
  attachments?: LeaveRequestAttachmentInputDto[]

  @ApiPropertyOptional({ description: "Employee acting in this employee's stead while away." })
  @IsString()
  @IsOptional()
  delegateEmployeeId?: string

  @ApiPropertyOptional({
    description: "Proceed even if this would take the balance negative (HR use only).",
  })
  @IsBoolean()
  @IsOptional()
  hrOverride?: boolean
}

export class CancelLeaveRequestDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  @MinLength(3, { message: "Please provide a reason for cancelling this leave request." })
  cancellationReason!: string

  @ApiPropertyOptional({ description: "Cloudinary URL, set via POST /uploads first." })
  @IsString()
  @IsOptional()
  attachmentUrl?: string
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
  @IsString()
  @IsOptional()
  actingEmployeeId?: string
}
