import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

export class CreateDepartmentDto {
  @IsUUID()
  functionId!: string

  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional({ description: "Genuine Department-to-Department hierarchy — distinct from functionId. See Department.parentDepartmentId's schema doc comment." })
  @IsUUID()
  @IsOptional()
  parentDepartmentId?: string
}
