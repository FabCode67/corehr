import { ApiPropertyOptional } from "@nestjs/swagger"
import { SignerRole } from "@prisma/client"
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator"

/** Stages sharing the same stageOrder sign in parallel — see the schema's
 *  module doc comment on FormSignatureStage. */
export class CreateSignatureStageDto {
  @IsInt()
  @Min(1)
  stageOrder!: number

  @IsEnum(SignerRole)
  role!: SignerRole

  @ApiPropertyOptional({ description: "Only for a SPECIFIC_APPROVER stage that's always the same person" })
  @IsString()
  @IsOptional()
  specificApproverId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  label?: string
}
