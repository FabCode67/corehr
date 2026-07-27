import { ApiPropertyOptional } from "@nestjs/swagger"
import { InterviewStatus } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator"

/** Reschedule / cancel — the actual interview outcome is recorded via
 *  RecordInterviewOutcomeDto instead. */
export class UpdateInterviewDto {
  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  interviewDate?: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string

  @ApiPropertyOptional()
  @IsEnum(InterviewStatus)
  @IsOptional()
  status?: InterviewStatus
}
