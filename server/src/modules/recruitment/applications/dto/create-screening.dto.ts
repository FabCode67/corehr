import { ApiPropertyOptional } from "@nestjs/swagger"
import { ScreeningDecision } from "@prisma/client"
import { IsEnum, IsOptional, IsString } from "class-validator"

export class CreateScreeningDto {
  @IsString()
  screenedById!: string

  @IsEnum(ScreeningDecision)
  decision!: ScreeningDecision

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string
}
