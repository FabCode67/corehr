import { ApiPropertyOptional } from "@nestjs/swagger"
import { InterviewType } from "@prisma/client"
import { Type } from "class-transformer"
import { ArrayUnique, IsArray, IsDate, IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateInterviewDto {
  @IsUUID()
  applicationId!: string

  @IsEnum(InterviewType)
  interviewType!: InterviewType

  @Type(() => Date)
  @IsDate()
  interviewDate!: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string

  @ApiPropertyOptional({ description: "Employee numbers of the interview panel members", type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  panelistIds?: string[]
}
