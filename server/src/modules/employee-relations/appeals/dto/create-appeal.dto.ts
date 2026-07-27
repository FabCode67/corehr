import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsArray, IsOptional, IsString } from "class-validator"

export class CreateAppealDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  appealReason!: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportingDocumentUrls?: string[]
}
