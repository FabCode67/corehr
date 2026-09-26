import { Body, Controller, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"

import { AuthService } from "./auth.service"
import { ChangePasswordDto } from "./dto/change-password.dto"
import { LoginDto } from "./dto/login.dto"
import { Public } from "./public.decorator"

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // The only endpoint in the entire API that doesn't require a valid
  // session token — everything else sits behind JwtAuthGuard (registered
  // globally in auth.module.ts). Tightened well below the global default
  // (5/min, tracked by attempted email rather than IP — see
  // AppThrottlerGuard's doc comment) since this is the one route where
  // credential-stuffing actually matters.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
