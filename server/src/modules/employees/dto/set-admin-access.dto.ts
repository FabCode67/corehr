import { IsBoolean } from "class-validator"

export class SetAdminAccessDto {
  @IsBoolean()
  isAdmin!: boolean
}
