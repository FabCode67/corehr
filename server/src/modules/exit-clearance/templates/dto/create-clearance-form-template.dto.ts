import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator"

export class CreateClearanceFormTemplateDto {
  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: "Whether the exit cannot be finalized until this form is COMPLETED. Defaults to true." })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean

  @ApiPropertyOptional({ description: "Department responsible for reviewing this form — e.g. Security, IT, Credit." })
  @IsUUID()
  responsibleDepartmentId!: string

  @ApiPropertyOptional({ description: "Position (within responsibleDepartmentId) whose current holder(s) can review/confirm/sign this form — e.g. Security Manager." })
  @IsUUID()
  responsiblePositionId!: string

  @ApiPropertyOptional({ description: "Whether the exiting employee must mark their own part done before review. Defaults to true." })
  @IsBoolean()
  @IsOptional()
  requiresEmployeeCompletion?: boolean

  @ApiPropertyOptional({ description: "Whether the reviewer must confirm/approve the form. Defaults to true." })
  @IsBoolean()
  @IsOptional()
  requiresConfirmation?: boolean

  @ApiPropertyOptional({ description: "Whether the reviewer must sign off on the form. Defaults to false." })
  @IsBoolean()
  @IsOptional()
  requiresSignature?: boolean

  @ApiPropertyOptional({ description: "Days from assignment until this form is considered overdue. Defaults to 7." })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  daysToComplete?: number

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number
}
