/**
 * Shared HS256 secret used to sign/verify the session token — the SAME
 * value must also be set as `JWT_SECRET` in the Next.js client's server
 * environment (see client/lib/session.ts), since the client verifies this
 * exact token itself (for role-based routing in middleware.ts/getSession())
 * rather than treating it as an opaque string. Falls back to an obviously
 * insecure dev default so local setups keep working without extra config,
 * but refuses to boot with that default in production.
 */
export const JWT_SECRET = (() => {
  const fromEnv = process.env.JWT_SECRET
  if (fromEnv) return fromEnv
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production — refusing to start with the insecure dev default.")
  }
  return "dev-only-insecure-secret-do-not-use-in-production"
})()

/** Matches the session cookie's maxAge in client/app/login/actions.ts (8
 *  hours) — kept as one constant here since both ends need to agree, even
 *  though only the server actually enforces expiry via signature+claims. */
export const JWT_EXPIRES_IN_SECONDS = process.env.JWT_EXPIRES_IN_SECONDS ? Number(process.env.JWT_EXPIRES_IN_SECONDS) : 60 * 60 * 8
