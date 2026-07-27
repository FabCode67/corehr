import { ApiPropertyOptional } from "@nestjs/swagger"
import { ContractType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

/** positionId/departmentId/branchId are NOT accepted here — they're
 *  snapshotted from the application's requisition at creation time, mirroring
 *  JobRequisition's own org-context snapshot pattern. bandId is supplied
 *  explicitly since it doubles as the offer's Salary Grade and may differ
 *  from the requisition's original band. */
export class CreateOfferDto {
  @IsUUID()
  applicationId!: string

  @IsUUID()
  bandId!: string

  @IsEnum(ContractType)
  contractType!: ContractType

  @Type(() => Date)
  @IsDate()
  proposedStartDate!: Date

  @Type(() => Date)
  @IsDate()
  expiryDate!: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  offerLetterUrl?: string

  @IsString()
  createdById!: string
}
