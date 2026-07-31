import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsIn, IsOptional, IsString } from "class-validator"

export class ReviewInstitutionDto {
  @IsIn(["VERIFIED", "REJECTED"])
  decision!: "VERIFIED" | "REJECTED"

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string

  @IsString()
  actingEmployeeId!: string
}
