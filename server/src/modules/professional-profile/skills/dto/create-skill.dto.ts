import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString, MaxLength } from "class-validator"

/** "Custom skill addition" — inserted into the shared catalog immediately,
 *  no HR review (see Skill model's doc comment). */
export class CreateSkillDto {
  @MaxLength(100)
  @IsString()
  name!: string

  @ApiPropertyOptional({ description: 'e.g. "Technical", "Professional" — freeform, defaults to "General".' })
  @MaxLength(50)
  @IsString()
  @IsOptional()
  category?: string

  @IsString()
  actingEmployeeId!: string
}
