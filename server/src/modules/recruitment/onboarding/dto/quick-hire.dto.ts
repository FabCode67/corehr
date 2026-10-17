import { ApiPropertyOptional } from "@nestjs/swagger"
import { Gender, MaritalStatus } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator"

/** The few details recruitment doesn't already know — everything else (position,
 *  band, branch, contract, name, email, phone, nationality) comes from the
 *  requisition and the candidate. */
export class QuickHireDto {
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

  @Type(() => Date)
  @IsDate()
  employmentStartDate!: Date

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
