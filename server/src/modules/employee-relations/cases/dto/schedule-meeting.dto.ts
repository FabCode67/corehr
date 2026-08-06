import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { ArrayUnique, IsArray, IsDate, IsOptional, IsString } from "class-validator"

export class ScheduleMeetingDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string

  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string

  @IsString()
  createdById!: string

  /** Staff to email a meeting invitation to — beyond the case's own
   *  employee, who's already notified in-app. See DisciplinaryMeetingInvitee's
   *  schema doc comment for why this never grants case access. */
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  inviteeIds?: string[]
}
