import { ApiPropertyOptional } from "@nestjs/swagger"
import { EducationType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator"

/** Step 5 (Education & Professional Development) — one record per
 *  degree/diploma/certificate/training/course/workshop. Unlimited per
 *  employee, added/removed dynamically in the UI. */
export class CreateEducationDto {
  @IsEnum(EducationType)
  type!: EducationType

  @MaxLength(160)
  @IsString()
  title!: string

  @MaxLength(160)
  @IsString()
  institution!: string

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  fieldOfStudy?: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  grade?: string

  @Type(() => Date)
  @IsDate()
  startDate!: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date

  @ApiPropertyOptional({ description: "Cloudinary URL, set via POST /uploads first." })
  @IsString()
  @IsOptional()
  certificateUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string
}

export class UpdateEducationDto {
  @ApiPropertyOptional({ enum: EducationType })
  @IsEnum(EducationType)
  @IsOptional()
  type?: EducationType

  @ApiPropertyOptional()
  @MaxLength(160)
  @IsString()
  @IsOptional()
  title?: string

  @ApiPropertyOptional()
  @MaxLength(160)
  @IsString()
  @IsOptional()
  institution?: string

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  fieldOfStudy?: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  grade?: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  certificateUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string
}
