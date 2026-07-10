import { Global, Module } from "@nestjs/common"

import { PrismaService } from "./prisma.service"

/**
 * Global module — PrismaService is injected all over the app, so every
 * feature module would otherwise need to re-import PrismaModule.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
