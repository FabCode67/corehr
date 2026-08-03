import { Body, Controller, ForbiddenException, Get, Inject, Param, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

import { PrismaService } from "../../prisma/prisma.service"

import { AiAssistantOrchestratorService } from "./ai-assistant-orchestrator.service"
import { AiAuditLogService } from "./ai-audit-log.service"
import { AiConversationService } from "./ai-conversation.service"
import { AiPendingActionService } from "./ai-pending-action.service"
import type { AiChatProvider } from "./llm/ai-chat-provider.interface"
import { AI_CHAT_PROVIDER } from "./llm/ai-chat-provider.token"

// The global ValidationPipe is configured with { whitelist: true,
// forbidNonWhitelisted: true } (see main.ts) — any DTO property with zero
// class-validator decorators is invisible to whitelisting and gets
// stripped/rejected, even though it's typed correctly. Every field below
// needs at least one decorator purely to be "seen", same fix as
// FieldResponseInputDto.value earlier in this app (forms/instances/dto/
// save-responses.dto.ts).
class ChatDto {
  @IsString()
  actingEmployeeId!: string

  @IsString()
  message!: string

  @IsOptional()
  @IsString()
  conversationId?: string
}

class ConfirmActionDto {
  @IsString()
  actingEmployeeId!: string
}

@ApiTags("AI Assistant")
@Controller("ai-assistant")
export class AiAssistantController {
  constructor(
    private readonly orchestrator: AiAssistantOrchestratorService,
    private readonly conversations: AiConversationService,
    private readonly pendingActions: AiPendingActionService,
    private readonly auditLog: AiAuditLogService,
    private readonly prisma: PrismaService,
    @Inject(AI_CHAT_PROVIDER) private readonly llm: AiChatProvider
  ) {}

  @Get("status")
  status() {
    return {
      configured: this.llm.isConfigured,
      provider: this.llm.isConfigured ? this.llm.providerName : null,
      model: this.llm.isConfigured ? this.llm.model : null,
    }
  }

  @Post("chat")
  chat(@Body() body: ChatDto) {
    return this.orchestrator.chat(body.actingEmployeeId, body.message, body.conversationId)
  }

  @Get("conversations")
  listConversations(@Query("actingEmployeeId") actingEmployeeId: string) {
    return this.conversations.listForEmployee(actingEmployeeId)
  }

  @Get("conversations/:id")
  getConversation(@Param("id") id: string, @Query("actingEmployeeId") actingEmployeeId: string) {
    return this.conversations.getWithMessages(id, actingEmployeeId)
  }

  @Post("actions/:id/confirm")
  confirmAction(@Param("id") id: string, @Body() body: ConfirmActionDto) {
    return this.pendingActions.confirmAndExecute(id, body.actingEmployeeId)
  }

  @Post("actions/:id/reject")
  rejectAction(@Param("id") id: string, @Body() body: ConfirmActionDto) {
    return this.pendingActions.reject(id, body.actingEmployeeId)
  }

  @Get("audit-log")
  async auditLogList(
    @Query("actingEmployeeId") actingEmployeeId: string,
    @Query("employeeId") employeeId?: string,
    @Query("eventType") eventType?: string,
    @Query("page") page?: string
  ) {
    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: actingEmployeeId }, select: { isAdmin: true } })
    if (!actor?.isAdmin) throw new ForbiddenException("Only HR administrators can view the AI Assistant audit log.")
    return this.auditLog.list({ employeeId, eventType, page: page ? Number(page) : undefined })
  }
}
