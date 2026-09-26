import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"

const logger = new Logger("PrismaService")

/**
 * Explicitly sizes the connection pool rather than leaving it at Prisma's
 * default (`num_cpus * 2 + 1`, decided with no awareness of how many other
 * instances of this API might also be opening their own pool against the
 * same database). Fine for a single instance, but scaling out horizontally
 * multiplies that default per instance and can exhaust Postgres' own
 * `max_connections` — this was flagged as an open risk in this app's
 * scalability review.
 *
 * Only fills in `connection_limit`/`pool_timeout` when DATABASE_URL
 * doesn't already specify them, so an operator who's deliberately tuned
 * these isn't overridden. Override the defaults via the
 * `PRISMA_CONNECTION_LIMIT`/`PRISMA_POOL_TIMEOUT` env vars (or just set the
 * query params directly on DATABASE_URL) — e.g. running N instances should
 * set `connection_limit` so `N * connection_limit` stays comfortably under
 * the database's `max_connections`.
 *
 * Also sets `pgbouncer=true` when the host looks like a transaction-mode
 * pooler (Neon's "-pooler" endpoint, PgBouncer, Supabase's pooler, etc. —
 * see schema.prisma's datasource doc comment on why this app uses one).
 * Without it, Prisma's prepared statements can collide across pooled
 * connections under concurrent load ("prepared statement already exists"
 * errors) — an easy thing to miss until it shows up under real traffic.
 */
function buildDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL
  if (!raw) return undefined // let Prisma's own startup error surface as normal

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    logger.warn("DATABASE_URL isn't a standard URL — using it as-is, without connection pool defaults.")
    return raw
  }

  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT ?? "10")
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT ?? "10")
  }
  if (!url.searchParams.has("pgbouncer") && /pool/i.test(url.hostname)) {
    url.searchParams.set("pgbouncer", "true")
  }

  return url.toString()
}

/**
 * Thin wrapper around PrismaClient so it can be injected via Nest's DI
 * container and its connection lifecycle tied to the app's lifecycle.
 *
 * Employee.passwordHash is globally omitted from every query result here —
 * secure by default, so no controller/service can accidentally leak it by
 * forgetting to exclude it. AuthService explicitly opts back in per-query
 * (`omit: { passwordHash: false }`) for the two places that actually need
 * to read it (login, change-password).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const datasourceUrl = buildDatasourceUrl()
    super({
      omit: {
        employee: {
          passwordHash: true,
        },
      },
      ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
