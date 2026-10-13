import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsObject, IsOptional, IsString, IsUUID } from "class-validator"

import type { JdContent } from "../jd-content"

/** Structured save: `content` follows the NCBA template sections (see jd-content.ts). */
export class SaveJobDescriptionDto {
  @IsObject()
  content!: JdContent

  @ApiPropertyOptional({ description: "The position this JD is written for (enables reuse)." })
  @IsUUID()
  @IsOptional()
  positionId?: string

  @ApiPropertyOptional({ description: "Attach the saved JD to this requisition." })
  @IsUUID()
  @IsOptional()
  requisitionId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredBandId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  actingEmployeeId?: string
}
