import { Body, Controller, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { AuthService } from "./auth.service"
import { ChangePasswordDto } from "./dto/change-password.dto"
import { LoginDto } from "./dto/login.dto"

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post("change-password")
  changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto)
  }

  @Post("accept-terms")
  acceptTerms(@Body("employeeId") employeeId: string) {
    return this.authService.acceptTerms(employeeId)
  }
}
