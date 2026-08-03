/**
 * DI token for whichever AiChatProvider is active (see
 * ai-assistant.module.ts for the AI_PROVIDER env-var selection). Consumers
 * (orchestrator, controller) inject this token rather than a concrete
 * provider class, so they never need to know or care which model is
 * actually answering.
 */
export const AI_CHAT_PROVIDER = Symbol("AI_CHAT_PROVIDER")
