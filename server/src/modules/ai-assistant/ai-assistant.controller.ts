import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { PrismaService } from "../../prisma/prisma.service"

import { AiAssistantOrchestratorService } from "./ai-assistant-orchestrator.service"
import { AiAuditLogService } from "./ai-audit-log.service"
import { AiConversationService } from "./ai-conversation.service"
import { AiPendingActionService } from "./ai-pending-action.service"
import { AnthropicClientService } from "./llm/anthropic-client.service"

class ChatDto {
  actingEmployeeId!: string
  message!: string
  conversationId?: string
}

class ConfirmActionDto {
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
    private readonly llm: AnthropicClientService
  ) {}

  @Get("status")
  status() {
    return { configured: this.llm.isConfigured, model: this.llm.isConfigured ? this.llm.model : null }
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
