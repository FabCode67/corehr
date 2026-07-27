import { ApiPropertyOptional } from "@nestjs/swagger"
import { DisciplinaryCaseCategory } from "@prisma/client"
import { Type } from "class-transformer"
import { IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString } from "class-validator"

export class CreateDisciplinaryCaseDto {
  @IsString()
  employeeId!: string

  @IsString()
  reportedById!: string

  @Type(() => Date)
  @IsDate()
  incidentDate!: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  incidentLocation?: string

  @IsEnum(DisciplinaryCaseCategory)
  category!: DisciplinaryCaseCategory

  @IsString()
  subject!: string

  @IsString()
  description!: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportingDocumentUrls?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  witnesses?: string[]

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  investigationRequired?: boolean

  @ApiPropertyOptional({ description: "Hides this case from the employee's line manager regardless of reporting line — see schema module doc comment." })
  @IsBoolean()
  @IsOptional()
  isConfidential?: boolean
}
