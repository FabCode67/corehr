import { ApiPropertyOptional } from "@nestjs/swagger"
import { EducationType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

/** Either institutionId (selected from the searchable catalog) or
 *  institutionName (the "Not Found? Add Institution Manually" fallback,
 *  entered inline without necessarily creating an AcademicInstitution row —
 *  see EducationRecordsService.create()) must be provided; enforced in the
 *  service rather than here since class-validator doesn't do cross-field
 *  "at least one of" checks cleanly. */
export class CreateEducationRecordDto {
  @IsString()
  employeeId!: string

  @IsEnum(EducationType)
  type!: EducationType

  @MaxLength(200)
  @IsString()
  title!: string // Qualification / Degree Title

  @ApiPropertyOptional({ description: "Selected from the institution catalog." })
  @IsUUID()
  @IsOptional()
  institutionId?: string

  @ApiPropertyOptional({ description: "Manual entry when not found in the catalog." })
  @MaxLength(200)
  @IsString()
  @IsOptional()
  institutionName?: string

  @ApiPropertyOptional()
  @MaxLength(100)
  @IsString()
  @IsOptional()
  country?: string

  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  fieldOfStudy?: string

  @ApiPropertyOptional()
  @MaxLength(20)
  @IsString()
  @IsOptional()
  grade?: string

  @Type(() => Date)
  @IsDate()
  startDate!: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  graduationDate?: Date

  @ApiPropertyOptional({ description: "Cloudinary URL, set via POST /uploads first." })
  @IsString()
  @IsOptional()
  certificateUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  certificateFileName?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  /** Who is submitting this — required so the service can record addedById
   *  and auto-verify when an HR admin is entering it directly. */
  @IsString()
  actingEmployeeId!: string
}
