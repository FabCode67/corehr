import { ApiPropertyOptional } from "@nestjs/swagger"
import { FieldType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator"

import { FieldOptionDto, TableColumnDto } from "./field-option.dto"

export class CreateFormFieldDto {
  @IsEnum(FieldType)
  fieldType!: FieldType

  @IsString()
  label!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  helpText?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean

  @IsInt()
  @Min(0)
  order!: number

  @ApiPropertyOptional({ type: [FieldOptionDto], description: "DROPDOWN/RADIO/CHECKBOX/MULTI_SELECT only" })
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  @IsArray()
  @IsOptional()
  options?: FieldOptionDto[]

  @ApiPropertyOptional({ type: [TableColumnDto], description: "TABLE fields only" })
  @ValidateNested({ each: true })
  @Type(() => TableColumnDto)
  @IsArray()
  @IsOptional()
  tableColumns?: TableColumnDto[]
}
