import { ApiPropertyOptional } from "@nestjs/swagger"
import { CourseAssignmentPriority } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateAssignmentDto {
  @IsUUID()
  courseId!: string

  @IsString()
  employeeId!: string

  /** Employee initiating the assignment (HR admin or manager) — used to
   *  resolve access and recorded as assignedById. */
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

  @ApiPropertyOptional({ description: 'e.g. "Complete this course before taking ownership of the Digital Channels platform."' })
  @IsString()
  @IsOptional()
  recommendationComment?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reasonForAssignment?: string
}
