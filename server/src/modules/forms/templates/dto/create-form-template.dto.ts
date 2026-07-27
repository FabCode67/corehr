import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

export class CreateFormTemplateDto {
  @MaxLength(150)
  @IsString()
  title!: string

  @MaxLength(40)
  @IsString()
  formCode!: string

  @IsString()
  description!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  purpose?: string

  @IsUUID()
  categoryId!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requirementsInstructions?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  applicableDepartmentId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  applicableEmployeeCategory?: string

  @IsString()
  createdById!: string
}
