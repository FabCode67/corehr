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
 * own endpoint and can be left blank indefinitely.
 */
export class CreateEmployeeDto {
  /** Normally left unset — EmployeesService auto-generates EMP-#### in that
   *  case. Settable by an admin creating an employee one at a time (the
   *  "Staff ID" field on the New Employee form) or via the Employees bulk
   *  import, for the same reason: preserving a known staff ID (e.g. one
   *  carried over from a previous system) instead of letting a new one be
   *  generated. Rejected with a clear conflict error if it's already taken
   *  — see EmployeesService.create(). */
  @ApiPropertyOptional({ description: "Optional — set to preserve a known staff ID. Leave unset to auto-generate EMP-####." })
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/, { message: "employeeNumber must start with a letter/number and be at most 30 characters (letters, numbers, '.', '_', '-')." })
  @IsOptional()
  employeeNumber?: string

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

  @ApiPropertyOptional()
  @MaxLength(40)
  @IsString()
  @IsOptional()
  passportNumber?: string

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContact?: string

  @ApiPropertyOptional({
    description:
      "Only for documented exceptions (e.g. dotted-line reporting). Leave unset to derive the reporting manager automatically from the position hierarchy.",
  })
  @IsString()
  @IsOptional()
  reportingManagerOverrideId?: string
}
