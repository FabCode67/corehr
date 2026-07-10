import { ApiPropertyOptional } from "@nestjs/swagger"
import { PositionTrack } from "@prisma/client"
import { IsEnum, IsInt, IsOptional, IsString, Min, MaxLength } from "class-validator"

export class CreatePositionLevelDto {
  @MaxLength(60)
  @IsString()
  name!: string

  /** Short badge for compact UI (org-chart cards), e.g. "E1", "F2". */
  @ApiPropertyOptional()
  @MaxLength(10)
  @IsString()
  @IsOptional()
  code?: string

  /** Ordering within its track — lower rank = closer to entry-level. */
  @Min(1)
  @IsInt()
  rank!: number

  // Reuses Prisma's generated enum directly (rather than a parallel DTO
  // enum) so this can be passed straight through to `prisma.positionLevel
  // .create({ data: dto })` without a manual cast — see PositionsService /
  // EmployeesService for the alternative (cast) approach where the DTO
  // layer is deliberately kept decoupled from Prisma's types.
  @ApiPropertyOptional({ enum: PositionTrack, default: PositionTrack.STANDARD })
  @IsEnum(PositionTrack)
  @IsOptional()
  track?: PositionTrack
}
