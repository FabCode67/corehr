import { ApiPropertyOptional } from "@nestjs/swagger"
import { GrievanceCategory } from "@prisma/client"
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator"

export class CreateGrievanceDto {
  @IsString()
  employeeId!: string

  @IsString()
  subject!: string

  @IsString()
  description!: string

  @IsEnum(GrievanceCategory)
  category!: GrievanceCategory

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportingDocumentUrls?: string[]
}
