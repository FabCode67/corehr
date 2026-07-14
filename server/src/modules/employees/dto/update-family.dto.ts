import { ApiPropertyOptional } from "@nestjs/swagger"
import { Gender } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator"

/** Step 4 (Family Information) — partner half. Children are their own
 *  sub-resource (see create-child.dto.ts) since there can be any number. */
export class UpdatePartnerDto {
  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  partnerName?: string

  @ApiPropertyOptional()
  @MaxLength(30)
  @IsString()
  @IsOptional()
  partnerPhone?: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  partnerDateOfBirth?: Date
}

export class CreateChildDto {
  @MaxLength(120)
  @IsString()
  fullName!: string

  @Type(() => Date)
  @IsDate()
  dateOfBirth!: Date

  @IsEnum(Gender)
  gender!: Gender
}

export class UpdateChildDto {
  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  fullName?: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dateOfBirth?: Date

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender
}
