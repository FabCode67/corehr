import { ApiPropertyOptional } from "@nestjs/swagger"
import { FormPriority } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

export class AssignFormDto {
  @IsUUID()
  formTemplateId!: string

  @IsString()
  employeeId!: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dueDate?: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instructions?: string

  @ApiPropertyOptional()
  @IsEnum(FormPriority)
  @IsOptional()
  priority?: FormPriority

  @IsString()
  assignedById!: string
}
