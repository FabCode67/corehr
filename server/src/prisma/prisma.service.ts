import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"

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
    super({
      omit: {
        employee: {
          passwordHash: true,
        },
      },
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
