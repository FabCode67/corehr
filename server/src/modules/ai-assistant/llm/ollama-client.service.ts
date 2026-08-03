import { Injectable, Logger, OnModuleInit } from "@nestjs/common"

import type {
  AiChatMessage,
  AiChatProvider,
  AiChatRequest,
  AiChatResponse,
} from "./ai-chat-provider.interface"

interface OllamaToolCall {
  id?: string
  type: "function"
  function: { name: string; arguments: string }
}

interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: OllamaToolCall[]
  tool_call_id?: string
}

interface OllamaChatCompletionResponse {
  choices?: Array<{
    message: { content: string | null; tool_calls?: OllamaToolCall[] }
    finish_reason?: string
  }>
}

/**
 * Self-hosted alternative to Claude — talks to a locally-running model
 * through Ollama's OpenAI-compatible /v1/chat/completions endpoint
 * (https://ollama.com: `ollama serve`, then `ollama pull <model>`). No
 * OpenAI or Anthropic API key, no per-token cost, no data leaving your own
 * machine/network — the tradeoff is tool-calling reliability: open models
 * (Llama 3.1, Qwen2.5, Mistral, ...) are noticeably less consistent than
 * Claude at emitting well-formed tool calls, which matters most for the
 * `propose_*` administrative-action tools (see action.tools.ts) since a
 * malformed proposal there just fails loudly (the two-phase confirm step
 * still protects real data either way), but a model that hallucinates a
 * plausible-looking analytics answer instead of calling the right read tool
 * is a real risk worth watching for at this tier.
 *
 * Configured via:
 *   AI_PROVIDER=ollama                        (selects this provider — see
 *                                               ai-assistant.module.ts)
 *   OLLAMA_BASE_URL=http://localhost:11434    (optional, this is the default)
 *   OLLAMA_MODEL=llama3.1                     (optional, this is the default;
 *                                               must already be pulled locally
 *                                               and must support tool calling)
 *
 * A reachability probe only runs on boot when AI_PROVIDER=ollama, so a
 * machine that isn't running Ollama at all doesn't get a spurious warning
 * every time the server starts with the (default) Anthropic provider active.
 */
@Injectable()
export class OllamaClientService implements OnModuleInit, AiChatProvider {
  private readonly logger = new Logger(OllamaClientService.name)
  private readonly baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/+$/, "")
  private readonly modelName = process.env.OLLAMA_MODEL ?? "llama3.1"
  private available = false

  readonly providerName = "ollama"

  async onModuleInit() {
    if ((process.env.AI_PROVIDER ?? "anthropic").toLowerCase() !== "ollama") {
      return
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
      this.available = res.ok
      if (res.ok) {
        this.logger.log(
          `Ollama AI Assistant provider configured — using model "${this.modelName}" at ${this.baseUrl}.`
        )
      } else {
        this.logger.warn(
          `Ollama responded but wasn't healthy at ${this.baseUrl} (HTTP ${res.status}) — the AI Assistant will report as unconfigured.`
        )
      }
    } catch (error) {
      this.available = false
      this.logger.warn(
        `Could not reach Ollama at ${this.baseUrl} — is "ollama serve" running? The AI Assistant will report as unconfigured until it's reachable. (${error instanceof Error ? error.message : "unknown error"})`
      )
    }
  }

  get isConfigured(): boolean {
    return this.available
  }

  get model(): string {
    return this.modelName
  }

  async createChat(request: AiChatRequest): Promise<AiChatResponse> {
    if (!this.available) {
      throw new Error("Ollama is not reachable.")
    }

    const messages: OllamaMessage[] = [
      { role: "system", content: request.system },
      ...request.messages.flatMap((m) => this.toOllamaMessages(m)),
    ]

    const tools = request.tools.map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.inputSchema },
    }))

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.modelName, messages, tools, tool_choice: "auto" }),
    })

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "")
      throw new Error(`Ollama request failed: HTTP ${res.status}${bodyText ? ` — ${bodyText.slice(0, 300)}` : ""}`)
    }

    const body = (await res.json()) as OllamaChatCompletionResponse
    const choice = body.choices?.[0]
    const toolCalls = (choice?.message.tool_calls ?? []).map((call, index) => ({
      id: call.id ?? `${index}`,
      name: call.function.name,
      input: this.parseArguments(call.function.arguments),
    }))

    return {
      text: choice?.message.content ?? "",
      toolCalls,
      stopReason: toolCalls.length > 0 ? "tool_use" : "end_turn",
    }
  }

  private parseArguments(raw: string): Record<string, unknown> {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  private toOllamaMessages(m: AiChatMessage): OllamaMessage[] {
    // Narrow via `in` on the distinguishing field (not `role`, which two
    // variants share) — TS then proves the trailing branch exhaustively.
    if ("toolCalls" in m) {
      return [
        {
          role: "assistant",
          content: null,
          tool_calls: m.toolCalls.map((call) => ({
            id: call.id,
            type: "function",
            function: { name: call.name, arguments: JSON.stringify(call.input) },
          })),
        },
      ]
    }
    if ("results" in m) {
      // OpenAI-compatible APIs want one "tool"-role message per result, not
      // a batched array.
      return m.results.map((r) => ({ role: "tool" as const, content: r.content, tool_call_id: r.toolUseId }))
    }
    return [{ role: m.role === "user" ? "user" : "assistant", content: m.text }]
  }
}
