import { Injectable } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"
import type { Request } from "express"

/**
 * Registered globally as APP_GUARD (see app.module.ts) — a coarse
 * safety net against a single client hammering the API, plus a much
 * tighter limit on POST /auth/login specifically (via @Throttle() there)
 * to blunt credential-stuffing now that login is real, checked auth
 * rather than a mock cookie (see the auth module).
 *
 * IMPORTANT CAVEAT: this app's Next.js server is the only thing that ever
 * calls this API directly (see lib/api/client.ts's doc comment on the
 * client side) — every real end user's request arrives here already
 * proxied through that one server, so the default IP-based tracking below
 * sees one IP for the entire app's traffic, not one per browser. That
 * makes the coarse default limit mostly a blunt "is something looping out
 * of control" guard rather than real per-user throttling. Login is the
 * one route where this matters most for security, so it's tracked by the
 * attempted email instead of IP — that still catches credential stuffing
 * regardless of how many source IPs an attacker spreads across, and
 * doesn't depend on trusting a forwarded-for header. If this API is ever
 * opened to callers other than this app's own Next.js server, revisit the
 * IP-based tracking for the rest of the routes too.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const isLogin = req.method === "POST" && req.url.includes("/auth/login")
    const email = isLogin && req.body && typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : null
    return email ? `login:${email}` : (req.ip ?? "unknown")
  }
}
