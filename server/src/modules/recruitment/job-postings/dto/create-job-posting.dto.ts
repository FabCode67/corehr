import { ApiPropertyOptional } from "@nestjs/swagger"
import { RecruitmentEmploymentType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

export class CreateJobPostingDto {
  @IsUUID()
  requisitionId!: string

  @MaxLength(150)
  @IsString()
  postingTitle!: string

  @ApiPropertyOptional({ description: "Post internally (default true)" })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean

  @ApiPropertyOptional({ description: "Post externally (default false)" })
  @IsBoolean()
  @IsOptional()
  isExternal?: boolean

  @Type(() => Date)
  @IsDate()
  closingDate!: Date

  @IsString()
  description!: string

  @IsString()
  responsibilities!: string

  @IsString()
  qualifications!: string

  @IsUUID()
  branchId!: string

  @IsEnum(RecruitmentEmploymentType)
  employmentType!: RecruitmentEmploymentType

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requiredExperience?: string
}
