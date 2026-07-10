import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsDate, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

export class CreateEmployeeDto {
  @MaxLength(20)
  @IsString()
  employeeNumber!: string

  @MaxLength(80)
  @IsString()
  firstName!: string

  @MaxLength(80)
  @IsString()
  lastName!: string

  @IsEmail()
  email!: string

  @IsUUID()
  positionId!: string

  @IsUUID()
  bandId!: string

  @Type(() => Date)
  @IsDate()
  hireDate!: Date

  @ApiPropertyOptional({
    description:
      "Only for documented exceptions (e.g. dotted-line reporting). Leave unset to derive the reporting manager automatically from the position hierarchy.",
  })
  @IsUUID()
  @IsOptional()
  reportingManagerOverrideId?: string
}
