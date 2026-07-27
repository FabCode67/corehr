import { ApiPropertyOptional } from "@nestjs/swagger"
import { Gender, MaritalStatus } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator"

/**
 * The final onboarding action — creates the real Employee record from the
 * hired candidate. Name/email/phone/nationality/branch/position/band/
 * contract type are all already known (from Candidate + the accepted
 * Offer/Requisition) and don't need to be re-entered here. What's collected
 * here is exactly the legal/HR information the Candidate profile never
 * asked for — see CreateEmployeeDto's required fields.
 */
export class CompleteOnboardingDto {
  @IsString()
  actingEmployeeId!: string

  @IsEnum(Gender)
  gender!: Gender

  @Type(() => Date)
  @IsDate()
  dateOfBirth!: Date

  @MaxLength(40)
  @IsString()
  nationalIdNumber!: string

  @IsEnum(MaritalStatus)
  maritalStatus!: MaritalStatus

  @ApiPropertyOptional({ description: "Cloudinary URL, set via POST /uploads first." })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reportingManagerOverrideId?: string

  @ApiPropertyOptional({ description: "Defaults to the accepted offer's proposedStartDate." })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  employmentStartDate?: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  probationEndDate?: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  contractEndDate?: Date
}
