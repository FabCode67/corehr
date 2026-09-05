import { ApiPropertyOptional } from "@nestjs/swagger"
import { FamilyRelationship, Gender } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator"

/** The generic "additional family member" sub-resource — see
 *  EmployeeFamilyMember's schema doc comment for why this is kept separate
 *  from Employee.partnerName/.../EmployeeChild (the Step 4 wizard's own
 *  fields). Until now this table could only be populated via the Bulk
 *  Import framework; these DTOs back the first CRUD UI for it (the staff
 *  Family & Dependents page and, by extension, anywhere else that reuses
 *  the same endpoints), letting an employee record parents, siblings, and
 *  any other dependent that doesn't fit the wizard's dedicated fields. */
export class CreateFamilyMemberDto {
  @MaxLength(120)
  @IsString()
  name!: string

  @IsEnum(FamilyRelationship)
  relationship!: FamilyRelationship

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dateOfBirth?: Date

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  occupation?: string

  @ApiPropertyOptional()
  @MaxLength(30)
  @IsString()
  @IsOptional()
  contactNumber?: string
}

export class UpdateFamilyMemberDto {
  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ enum: FamilyRelationship })
  @IsEnum(FamilyRelationship)
  @IsOptional()
  relationship?: FamilyRelationship

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dateOfBirth?: Date

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  occupation?: string

  @ApiPropertyOptional()
  @MaxLength(30)
  @IsString()
  @IsOptional()
  contactNumber?: string
}
