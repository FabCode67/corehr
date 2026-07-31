import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator"

/** "Not Found? Add Institution Manually" — the manual-entry path. Always
 *  starts PENDING_REVIEW (see InstitutionsService.create()); HR-seeded ones
 *  are inserted directly via prisma/seed.ts, bypassing this DTO. */
export class CreateInstitutionDto {
  @MaxLength(200)
  @IsString()
  name!: string

  @ApiPropertyOptional()
  @MaxLength(100)
  @IsString()
  @IsOptional()
  country?: string

  @ApiPropertyOptional()
  @MaxLength(100)
  @IsString()
  @IsOptional()
  city?: string

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  website?: string

  /** The employee submitting this — required so InstitutionsService can
   *  record addedById and, if they're an HR admin, auto-verify. */
  @IsString()
  actingEmployeeId!: string
}
