import { ApiPropertyOptional } from "@nestjs/swagger"
import { Gender, MaritalStatus } from "@prisma/client"
import { Type } from "class-transformer"
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator"

/**
 * Step 1 of the Employee Registration wizard — Basic Information. This is
 * the ONLY required step; every other field on Employee (employment
 * details, position/band, family, education) is filled in later via its
 * own endpoint and can be left blank indefinitely. employeeNumber is
 * intentionally absent — EmployeesService generates it, it's never
 * client-supplied.
 */
export class CreateEmployeeDto {
  @MaxLength(80)
  @IsString()
  firstName!: string

  @ApiPropertyOptional()
  @MaxLength(80)
  @IsString()
  @IsOptional()
  middleName?: string

  @MaxLength(80)
  @IsString()
  lastName!: string

  @ApiPropertyOptional()
  @MaxLength(80)
  @IsString()
  @IsOptional()
  preferredName?: string

  @IsEnum(Gender)
  gender!: Gender

  @Type(() => Date)
  @IsDate()
  dateOfBirth!: Date

  @MaxLength(40)
  @IsString()
  nationalIdNumber!: string

  @MaxLength(60)
  @IsString()
  nationality!: string

  @IsEnum(MaritalStatus)
  maritalStatus!: MaritalStatus

  @IsEmail()
  email!: string

  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: "phone must be a valid phone number" })
  phone!: string

  @IsUUID()
  branchId!: string

  @ApiPropertyOptional({ description: "Cloudinary URL, set via POST /uploads first." })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string

  @ApiPropertyOptional({
    description:
      "Only for documented exceptions (e.g. dotted-line reporting). Leave unset to derive the reporting manager automatically from the position hierarchy.",
  })
  @IsString()
  @IsOptional()
  reportingManagerOverrideId?: string
}
