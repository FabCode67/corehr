import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import Anthropic from "@anthropic-ai/sdk"

/**
 * Thin wrapper around the Anthropic Messages API, configured entirely from
 * an environment variable — same "report unconfigured rather than throw on
 * boot" shape as MailerService (see server/src/modules/email/mailer.service.ts):
 *
 *   ANTHROPIC_API_KEY=<key from console.anthropic.com>
 *   ANTHROPIC_MODEL=claude-sonnet-4-5   (optional, this is the default)
 *
 * The spec allows either "OpenAI GPT-5.5 or Claude 4 via API" — Claude was
 * chosen here since the rest of this codebase has no existing OpenAI
 * integration to match conventions with. Swapping providers later only
 * touches this one file: everything downstream (tool registry, orchestrator)
 * talks to the small interface below, not the Anthropic SDK types directly
 * — see AiChatModel/AiChatResponse further down.
 *
 * If ANTHROPIC_API_KEY isn't set, `isConfigured` is false and the
 * orchestrator returns a clear "assistant not configured" message instead
 * of the chat silently failing.
 */
@Injectable()
export class AnthropicClientService implements OnModuleInit {
  private readonly logger = new Logger(AnthropicClientService.name)
  private client: Anthropic | null = null
  private readonly modelName = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5"

  onModuleInit() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      this.logger.warn(
        "ANTHROPIC_API_KEY is not set — the AI HR Administration Assistant is disabled. Chat requests will be logged and answered with a setup notice until this environment variable is configured."
      )
      return
    }
    this.client = new Anthropic({ apiKey })
    this.logger.log(`AI HR Administration Assistant configured — using model ${this.modelName}.`)
  }

  get isConfigured(): boolean {
    return this.client !== null
  }

  get model(): string {
    return this.modelName
  }

  async createMessage(params: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">): Promise<Anthropic.Message> {
    if (!this.client) {
      throw new Error("ANTHROPIC_API_KEY is not configured.")
    }
    return this.client.messages.create({ model: this.modelName, ...params })
  }
}
