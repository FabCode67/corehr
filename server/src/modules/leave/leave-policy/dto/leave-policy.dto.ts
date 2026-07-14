import { ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
  ArrayMaxSize,
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator"

export class CreateHolidayDto {
  @MaxLength(120)
  @IsString()
  name!: string

  @Type(() => Date)
  @IsDate()
  date!: Date

  @ApiPropertyOptional({
    description: "If true, this holiday repeats every year on the same month/day.",
  })
  @IsBoolean()
  @IsOptional()
  isRecurringAnnually?: boolean
}

export class UpdateHolidayDto {
  @ApiPropertyOptional()
  @MaxLength(120)
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  date?: Date

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRecurringAnnually?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class UpdateLeaveSettingsDto {
  @ApiPropertyOptional({
    description: "Days of week treated as weekend (0=Sunday..6=Saturday).",
    type: [Number],
  })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMaxSize(7)
  @IsOptional()
  weekendDays?: number[]

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  excludeWeekends?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  excludePublicHolidays?: boolean
}
