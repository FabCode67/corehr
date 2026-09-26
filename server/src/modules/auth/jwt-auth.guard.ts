import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { JwtService } from "@nestjs/jwt"
import type { Request } from "express"

import { IS_PUBLIC_KEY } from "./public.decorator"
import type { SessionClaims } from "./session-claims.type"

/**
 * Registered globally as APP_GUARD (see auth.module.ts) — the fix for this
 * app's biggest architectural gap: every endpoint used to be reachable with
 * no server-side identity check at all (see AuthService's old doc comment).
 * Every request now needs a valid `Authorization: Bearer <token>` header,
 * except routes explicitly marked @Public() (just POST /auth/login).
 *
 * This proves the request carries a genuine, unexpired, un-tampered
 * session — it does NOT by itself re-derive every controller's
 * `actingEmployeeId` from the token instead of trusting the caller's own
 * parameter. That's a separate, larger authorization-layer change (dozens
 * of controllers/services across every module) deliberately left for a
 * follow-up rather than bundled into this pass.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request & { user?: SessionClaims }>()
    const token = extractBearerToken(request)
    if (!token) {
      throw new UnauthorizedException("Missing or malformed Authorization header.")
    }

    try {
      request.user = this.jwtService.verify<SessionClaims>(token)
      return true
    } catch {
      throw new UnauthorizedException("Invalid or expired session — please log in again.")
    }
  }
}

function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization
  if (!header?.startsWith("Bearer ")) return undefined
  return header.slice("Bearer ".length).trim() || undefined
}
