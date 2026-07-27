import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

/** Reusable Job Description template — created standalone and linked to one
 *  or more JobRequisitions (JobRequisition.jobDescriptionId), per the spec's
 *  "reusable templates" requirement. */
export class CreateJobDescriptionDto {
  @MaxLength(150)
  @IsString()
  jobTitle!: string

  @IsString()
  jobSummary!: string

  @IsString()
  keyResponsibilities!: string

  @IsString()
  requiredQualifications!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requiredCertifications?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requiredExperience?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requiredSkills?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  technicalCompetencies?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  behaviouralCompetencies?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredLevelId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  requiredBandId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reportingManagerId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  workLocation?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
