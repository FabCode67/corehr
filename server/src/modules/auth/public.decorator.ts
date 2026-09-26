import { SetMetadata } from "@nestjs/common"

export const IS_PUBLIC_KEY = "isPublic"

/** Marks a route as reachable without a valid session token — only
 *  POST /auth/login should ever need this. Everything else goes through
 *  JwtAuthGuard by default (registered globally, see auth.module.ts). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
