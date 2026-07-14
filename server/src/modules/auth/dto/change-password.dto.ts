import { IsString, IsUUID, MinLength } from "class-validator"

export class ChangePasswordDto {
  @IsUUID()
  employeeId!: string

  @IsString()
  @MinLength(1)
  currentPassword!: string

  @IsString()
  @MinLength(8, { message: "New password must be at least 8 characters." })
  newPassword!: string
}
