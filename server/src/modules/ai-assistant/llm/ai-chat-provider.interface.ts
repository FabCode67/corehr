import type { AiToolDefinition } from "../tools/types"

/**
 * Provider-neutral chat-loop types. Nothing outside `llm/` should import
 * `@anthropic-ai/sdk` or any other vendor SDK — the orchestrator and tool
 * registry only ever see the shapes below, so swapping which model answers
 * the chat (Claude via the Anthropic API, or a self-hosted open-source model
 * via Ollama) is a one-file, one-provider-implementation change plus a
 * one-line pick in ai-assistant.module.ts. See that module's doc comment for
 * the full list of tradeoffs between the two.
 */

export interface AiToolCall {
  /** Provider-assigned id for this specific call, echoed back on the
   *  matching tool_result so the model can line results up with requests. */
  id: string
  name: string
  input: Record<string, unknown>
}

export interface AiToolResultMessage {
  toolUseId: string
  /** Always a string — both providers want the tool's output serialized,
   *  not a raw object. */
  content: string
}

/**
 * One turn of the running conversation the orchestrator maintains for a
 * single chat() call. Prior *completed* turns are replayed as plain
 * user/assistant text only (see ai-assistant-orchestrator.service.ts) — the
 * `toolCalls`/`tool_result` variants only ever appear within the current
 * turn's tool-use loop, never across turns, so no provider has to reconstruct
 * a stale tool_use/tool_result pairing from history.
 */
export type AiChatMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string }
  | { role: "assistant"; toolCalls: AiToolCall[] }
  | { role: "tool_result"; results: AiToolResultMessage[] }

export interface AiChatRequest {
  system: string
  messages: AiChatMessage[]
  tools: AiToolDefinition[]
  maxTokens: number
}

export type AiChatStopReason = "tool_use" | "end_turn"

export interface AiChatResponse {
  text: string
  toolCalls: AiToolCall[]
  stopReason: AiChatStopReason
}

export interface AiChatProvider {
  readonly isConfigured: boolean
  readonly model: string
  readonly providerName: string
  createChat(request: AiChatRequest): Promise<AiChatResponse>
}
