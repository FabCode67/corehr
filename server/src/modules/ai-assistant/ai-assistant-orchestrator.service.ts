import { Injectable, NotFoundException } from "@nestjs/common"
import type Anthropic from "@anthropic-ai/sdk"

import { PrismaService } from "../../prisma/prisma.service"

import { AiAuditLogService } from "./ai-audit-log.service"
import { AiConversationService } from "./ai-conversation.service"
import { AnthropicClientService } from "./llm/anthropic-client.service"
import { buildSystemPrompt } from "./system-prompt.util"
import { ToolRegistryService } from "./tools/tool-registry.service"
import type { ToolContext } from "./tools/types"

const NOT_CONFIGURED_NOTICE =
  "The AI HR Administration Assistant isn't fully set up yet — an administrator needs to add an ANTHROPIC_API_KEY to the server's environment before I can answer questions. Once that's configured, I'll be able to pull live workforce, leave, performance, recruitment, learning, and employee relations data for you, generate reports, and (for HR administrators) propose administrative actions for your confirmation."

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
 * The chat loop: load/create a conversation, call Claude with the tool set
 * this actor is allowed to use, execute any tool_use blocks it requests,
 * feed results back, repeat until it produces a final text answer (or the
 * loop cap is hit), then persist everything.
 */
@Injectable()
export class AiAssistantOrchestratorService {
  constructor(
    private readonly llm: AnthropicClientService,
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
    const anthropicTools = this.toolRegistry.toAnthropicTools(tools)
    const systemPrompt = buildSystemPrompt(actor, actingEmployeeId)

    // Conversation memory: prior turns are replayed as plain user/assistant
    // text (not raw tool_use content blocks). This keeps context across
    // turns simple and always-valid (no risk of an orphaned tool_use/
    // tool_result pairing after a schema change) — the model still has
    // every number it previously reported, just as prose rather than
    // structured blocks, which is enough for natural follow-up questions.
    const history = await this.conversations.history(conversation.id)
    const runningMessages: Anthropic.MessageParam[] = history.slice(0, -1).map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }))
    runningMessages.push({ role: "user", content: message })

    const artifacts: ChatArtifact[] = []
    const toolTrace: Array<{ tool: string; input: unknown }> = []
    let finalText = ""

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      const response = await this.llm.createMessage({
        system: systemPrompt,
        max_tokens: 2048,
        messages: runningMessages,
        tools: anthropicTools,
      })

      const textBlocks = response.content.filter((block): block is Anthropic.TextBlock => block.type === "text")
      finalText = textBlocks.map((b) => b.text).join("\n\n") || finalText

      const toolUseBlocks = response.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
      if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) break

      runningMessages.push({ role: "assistant", content: response.content })

      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolUseBlocks) {
        const result = await this.toolRegistry.execute(tools, block.name, (block.input as Record<string, unknown>) ?? {}, ctx, conversation.id)
        toolTrace.push({ tool: block.name, input: block.input })

        // Note: ChartArtifact's own `type` field (bar/pie/donut/line/area) is
        // renamed to `chartType` here so it doesn't collide with this
        // wrapper's discriminant `type: "chart"` field.
        if (result.chart) artifacts.push({ type: "chart", chartType: result.chart.type, title: result.chart.title, data: result.chart.data, dataKey: result.chart.dataKey, nameKey: result.chart.nameKey })
        if (result.table) artifacts.push({ type: "table", ...result.table })
        if (result.reportLink) artifacts.push({ type: "report_link", ...result.reportLink })
        if (result.pendingAction) artifacts.push({ type: "pending_action", ...result.pendingAction })

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result.forModel ?? null).slice(0, 8000),
        })
      }
      runningMessages.push({ role: "user", content: toolResultBlocks })
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
