import { IsEmail, IsString, MinLength } from "class-validator"

export class ForgotPasswordDto {
  @IsEmail()
  email!: string
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  token!: string

  @IsString()
  @MinLength(8, { message: "New password must be at least 8 characters." })
  newPassword!: string
}
