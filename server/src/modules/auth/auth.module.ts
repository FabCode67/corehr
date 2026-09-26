import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { JwtModule } from "@nestjs/jwt"

import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JWT_EXPIRES_IN_SECONDS, JWT_SECRET } from "./jwt.constants"
import { JwtAuthGuard } from "./jwt-auth.guard"

@Module({
  imports: [
    // `global: true` so JwtService is injectable anywhere (JwtAuthGuard
    // lives here, but every module's controllers now sit behind it).
    JwtModule.register({ global: true, secret: JWT_SECRET, signOptions: { expiresIn: JWT_EXPIRES_IN_SECONDS } }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
