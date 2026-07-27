import { ApiPropertyOptional } from "@nestjs/swagger"
import { CourseAssignmentPriority } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator"

export class UpdateAssignmentDto {
  @IsString()
  actingEmployeeId!: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dueDate?: Date

  @ApiPropertyOptional()
  @IsEnum(CourseAssignmentPriority)
  @IsOptional()
  priority?: CourseAssignmentPriority

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recommendationComment?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reasonForAssignment?: string
}
