import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import Anthropic from "@anthropic-ai/sdk"

import type {
  AiChatMessage,
  AiChatProvider,
  AiChatRequest,
  AiChatResponse,
} from "./ai-chat-provider.interface"

/**
 * Hosted Claude provider — thin wrapper around the Anthropic Messages API,
 * configured entirely from environment variables, same "report unconfigured
 * rather than throw on boot" shape as MailerService (see
 * server/src/modules/email/mailer.service.ts):
 *
 *   ANTHROPIC_API_KEY=<key from console.anthropic.com>
 *   ANTHROPIC_MODEL=claude-sonnet-4-5   (optional, this is the default)
 *
 * This is one of two interchangeable AiChatProvider implementations — see
 * llm/ollama-client.service.ts for the self-hosted alternative, and
 * ai-assistant.module.ts for how AI_PROVIDER picks between them. Everything
 * downstream (tool registry, orchestrator) talks to the neutral
 * AiChatProvider interface, never to Anthropic SDK types directly — the
 * translation to/from Anthropic's content-block format happens only in this
 * file.
 */
@Injectable()
export class AnthropicClientService implements OnModuleInit, AiChatProvider {
  private readonly logger = new Logger(AnthropicClientService.name)
  private client: Anthropic | null = null
  private readonly modelName = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5"

  readonly providerName = "anthropic"

  onModuleInit() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      this.logger.warn(
        "ANTHROPIC_API_KEY is not set — the Anthropic AI Assistant provider is unavailable. If AI_PROVIDER=anthropic (the default), the assistant will report as unconfigured until this is set."
      )
      return
    }
    this.client = new Anthropic({ apiKey })
    this.logger.log(`Anthropic AI Assistant provider configured — using model ${this.modelName}.`)
  }

  get isConfigured(): boolean {
    return this.client !== null
  }

  get model(): string {
    return this.modelName
  }

  async createChat(request: AiChatRequest): Promise<AiChatResponse> {
    if (!this.client) {
      throw new Error("ANTHROPIC_API_KEY is not configured.")
    }

    const messages = request.messages.map((m) => this.toAnthropicMessage(m))
    const tools: Anthropic.Tool[] = request.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }))

    const response = await this.client.messages.create({
      model: this.modelName,
      system: request.system,
      max_tokens: request.maxTokens,
      messages,
      tools,
    })

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    )
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    )

    return {
      text: textBlocks.map((b) => b.text).join("\n\n"),
      toolCalls: toolUseBlocks.map((b) => ({
        id: b.id,
        name: b.name,
        input: (b.input as Record<string, unknown>) ?? {},
      })),
      stopReason: response.stop_reason === "tool_use" && toolUseBlocks.length > 0 ? "tool_use" : "end_turn",
    }
  }

  private toAnthropicMessage(m: AiChatMessage): Anthropic.MessageParam {
    // Narrow via `in` on the distinguishing field (not `role`, which two
    // variants share) — TS then proves the trailing branch exhaustively.
    if ("toolCalls" in m) {
      const content: Anthropic.ToolUseBlockParam[] = m.toolCalls.map((call) => ({
        type: "tool_use",
        id: call.id,
        name: call.name,
        input: call.input,
      }))
      return { role: "assistant", content }
    }
    if ("results" in m) {
      // Anthropic expects tool_result blocks inside a user-role message.
      const content: Anthropic.ToolResultBlockParam[] = m.results.map((r) => ({
        type: "tool_result",
        tool_use_id: r.toolUseId,
        content: r.content,
      }))
      return { role: "user", content }
    }
    return { role: m.role === "user" ? "user" : "assistant", content: m.text }
  }
}
