import { Inject, Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../prisma/prisma.service"

import { AiAuditLogService } from "./ai-audit-log.service"
import { AiConversationService } from "./ai-conversation.service"
import type { AiChatMessage, AiChatProvider, AiToolResultMessage } from "./llm/ai-chat-provider.interface"
import { AI_CHAT_PROVIDER } from "./llm/ai-chat-provider.token"
import { buildSystemPrompt } from "./system-prompt.util"
import { ToolRegistryService } from "./tools/tool-registry.service"
import type { ToolContext } from "./tools/types"

const NOT_CONFIGURED_NOTICE =
  "The AI HR Administration Assistant isn't fully set up yet — an administrator needs to configure an AI provider on the server (ANTHROPIC_API_KEY for Claude, or AI_PROVIDER=ollama plus a reachable local model) before I can answer questions. Once that's configured, I'll be able to pull live workforce, leave, performance, recruitment, learning, and employee relations data for you, generate reports, and (for HR administrators) propose administrative actions for your confirmation."

const MAX_TOOL_LOOPS = 6

export interface ChatArtifact {
  type: "chart" | "table" | "report_link" | "pending_action"
  [key: string]: unknown
}

export interface ChatResult {
  conversationId: string
  messageId: string
  message: string
  artifacts: ChatArtifact[]
}

/**
 * The chat loop: load/create a conversation, call whichever AiChatProvider is
 * active (see llm/ai-chat-provider.token.ts) with the tool set this actor is
 * allowed to use, execute any tool calls it requests, feed results back,
 * repeat until it produces a final text answer (or the loop cap is hit), then
 * persist everything. This file is provider-agnostic by design — it never
 * imports an SDK type, only the neutral shapes in llm/ai-chat-provider.interface.ts.
 */
@Injectable()
export class AiAssistantOrchestratorService {
  constructor(
    @Inject(AI_CHAT_PROVIDER) private readonly llm: AiChatProvider,
    private readonly toolRegistry: ToolRegistryService,
    private readonly conversations: AiConversationService,
    private readonly auditLog: AiAuditLogService,
    private readonly prisma: PrismaService
  ) {}

  async chat(actingEmployeeId: string, message: string, conversationId?: string): Promise<ChatResult> {
    const conversation = await this.conversations.getOrCreate(conversationId, actingEmployeeId)
    await this.conversations.appendMessage(conversation.id, "USER", message)
    void this.auditLog.log(actingEmployeeId, "CHAT_MESSAGE", { role: "user", message }, conversation.id)

    if (!this.llm.isConfigured) {
      const saved = await this.conversations.appendMessage(conversation.id, "ASSISTANT", NOT_CONFIGURED_NOTICE)
      return { conversationId: conversation.id, messageId: saved.id, message: NOT_CONFIGURED_NOTICE, artifacts: [] }
    }

    const actor = await this.prisma.employee.findUnique({
      where: { employeeNumber: actingEmployeeId },
      select: { isAdmin: true, firstName: true, lastName: true },
    })
    if (!actor) throw new NotFoundException("Employee not found.")

    const ctx: ToolContext = { actingEmployeeId, isAdmin: actor.isAdmin }
    const tools = this.toolRegistry.getToolsFor(ctx, conversation.id)
    const systemPrompt = buildSystemPrompt(actor, actingEmployeeId)

    // Conversation memory: prior turns are replayed as plain user/assistant
    // text (not raw tool-call content). This keeps context across turns
    // simple and always-valid (no risk of an orphaned tool_use/tool_result
    // pairing after a schema or provider change) — the model still has every
    // number it previously reported, just as prose rather than structured
    // blocks, which is enough for natural follow-up questions.
    const history = await this.conversations.history(conversation.id)
    // Built as an explicit per-branch literal (not a computed `role`
    // property) so each object matches one exact AiChatMessage union member
    // rather than the widened `{ role: "user" | "assistant"; text: string }`
    // shape, which TS can't match back to the discriminated union.
    const runningMessages: AiChatMessage[] = history.slice(0, -1).map(
      (m): AiChatMessage => (m.role === "USER" ? { role: "user", text: m.content } : { role: "assistant", text: m.content })
    )
    runningMessages.push({ role: "user", text: message })

    const artifacts: ChatArtifact[] = []
    const toolTrace: Array<{ tool: string; input: unknown }> = []
    let finalText = ""

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      const response = await this.llm.createChat({
        system: systemPrompt,
        maxTokens: 2048,
        messages: runningMessages,
        tools,
      })

      finalText = response.text || finalText

      if (response.stopReason !== "tool_use" || response.toolCalls.length === 0) break

      runningMessages.push({ role: "assistant", toolCalls: response.toolCalls })

      const toolResults: AiToolResultMessage[] = []
      for (const call of response.toolCalls) {
        const result = await this.toolRegistry.execute(tools, call.name, call.input, ctx, conversation.id)
        toolTrace.push({ tool: call.name, input: call.input })

        // Note: ChartArtifact's own `type` field (bar/pie/donut/line/area) is
        // renamed to `chartType` here so it doesn't collide with this
        // wrapper's discriminant `type: "chart"` field.
        if (result.chart) artifacts.push({ type: "chart", chartType: result.chart.type, title: result.chart.title, data: result.chart.data, dataKey: result.chart.dataKey, nameKey: result.chart.nameKey })
        if (result.table) artifacts.push({ type: "table", ...result.table })
        if (result.reportLink) artifacts.push({ type: "report_link", ...result.reportLink })
        if (result.pendingAction) artifacts.push({ type: "pending_action", ...result.pendingAction })

        toolResults.push({ toolUseId: call.id, content: JSON.stringify(result.forModel ?? null).slice(0, 8000) })
      }
      runningMessages.push({ role: "tool_result", results: toolResults })
    }

    if (!finalText.trim()) {
      finalText = "I wasn't able to put together a complete answer for that — could you try rephrasing, or narrow down what you're asking about?"
    }

    const saved = await this.conversations.appendMessage(conversation.id, "ASSISTANT", finalText, { toolCalls: toolTrace, artifacts })
    await this.conversations.setTitleIfUnset(conversation.id, message)
    await this.conversations.touch(conversation.id)
    void this.auditLog.log(actingEmployeeId, "CHAT_MESSAGE", { role: "assistant", message: finalText, toolCallCount: toolTrace.length }, conversation.id)

    return { conversationId: conversation.id, messageId: saved.id, message: finalText, artifacts }
  }
}
