import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateBranchDto {
  @MaxLength(150)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isHeadquarters?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  /** Powers the Locations map — see Branch.latitude's schema doc comment. */
  @ApiPropertyOptional()
  @IsLatitude()
  @IsOptional()
  latitude?: number

  @ApiPropertyOptional()
  @IsLongitude()
  @IsOptional()
  longitude?: number
}
