import { ApiPropertyOptional } from "@nestjs/swagger"
import { PriorEmploymentType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateWorkExperienceDto {
  @IsString()
  employeeId!: string

  @MaxLength(160)
  @IsString()
  companyName!: string

  @MaxLength(160)
  @IsString()
  jobTitle!: string

  @IsEnum(PriorEmploymentType)
  employmentType!: PriorEmploymentType

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  location?: string

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  industry?: string

  @Type(() => Date)
  @IsDate()
  startDate!: Date

  @ApiPropertyOptional({ description: "Ignored (cleared server-side) when isCurrent is true." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skillsUsed?: string[]
}
