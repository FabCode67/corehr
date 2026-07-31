import { ApiPropertyOptional } from "@nestjs/swagger"
import { SkillLevel } from "@prisma/client"
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

export class AssignSkillDto {
  @IsUUID()
  skillId!: string

  @ApiPropertyOptional({ enum: SkillLevel })
  @IsEnum(SkillLevel)
  @IsOptional()
  level?: SkillLevel

  @IsString()
  employeeId!: string
}

export class UpdateSkillLevelDto {
  @IsEnum(SkillLevel)
  level!: SkillLevel
}
