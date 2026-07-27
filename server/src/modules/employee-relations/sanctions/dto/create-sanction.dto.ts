import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsArray, IsDate, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateSanctionDto {
  @IsString()
  actingEmployeeId!: string

  @IsUUID()
  sanctionTypeId!: string

  @ApiPropertyOptional({ description: "Defaults to now if omitted." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dateOfSanction?: Date

  @IsString()
  reason!: string

  @Type(() => Date)
  @IsDate()
  effectiveDate!: Date

  @IsString()
  issuedById!: string

  @ApiPropertyOptional({ description: "Recorded field only — see schema module doc comment on sanction approval." })
  @IsString()
  @IsOptional()
  approvalAuthorityId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportingDocumentUrls?: string[]
}
