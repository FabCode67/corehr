import { ApiPropertyOptional } from "@nestjs/swagger"
import { ContractType, OnboardingDocumentCategory } from "@prisma/client"
import { Type } from "class-transformer"
import { IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateDocumentTypeDto {
  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ enum: OnboardingDocumentCategory })
  @IsEnum(OnboardingDocumentCategory)
  @IsOptional()
  category?: OnboardingDocumentCategory

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean

  @ApiPropertyOptional({ enum: ContractType, isArray: true, description: "Empty/omitted = applies to every contract type." })
  @IsArray()
  @IsEnum(ContractType, { each: true })
  @IsOptional()
  applicableContractTypes?: ContractType[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableFunctionIds?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableDepartmentIds?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicablePositionIds?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableBandIds?: string[]

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  effectiveDate?: Date
}
