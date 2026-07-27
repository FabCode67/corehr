import { ApiPropertyOptional } from "@nestjs/swagger"
import { RecruitmentPriority } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsInt, IsOptional, IsUUID, Min } from "class-validator"

/** Only the fields that make sense to edit after creation — position,
 *  workforce plan, department/function/etc. snapshot, and hiring reason are
 *  fixed at creation time (create a new requisition instead if those need
 *  to change). */
export class UpdateRequisitionDto {
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfVacancies?: number

  @ApiPropertyOptional()
  @IsEnum(RecruitmentPriority)
  @IsOptional()
  priority?: RecruitmentPriority

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  targetStartDate?: Date

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  jobDescriptionId?: string
}
