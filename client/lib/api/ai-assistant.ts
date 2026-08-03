import { apiFetch, apiFetchSafe } from "./client"

// Mirrors server/src/modules/ai-assistant/*.

export type ChatArtifact =
  | { type: "chart"; title: string; chartType: "bar" | "pie" | "donut" | "line" | "area"; data: Array<Record<string, string | number>>; dataKey?: string; nameKey?: string }
  | { type: "table"; title: string; columns: string[]; rows: Array<Array<string | number>> }
  | { type: "report_link"; title: string; format: "xlsx" | "csv" | "pdf" | "pptx"; url: string }
  | { type: "pending_action"; id: string; actionType: string; description: string }

export interface ChatResponse {
  conversationId: string
  messageId: string
  message: string
  artifacts: ChatArtifact[]
}

export interface AiMessage {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  artifacts: ChatArtifact[] | null
  createdAt: string
}

export interface AiPendingAction {
  id: string
  actionType: string
  description: string
  status: "PENDING" | "CONFIRMED" | "EXECUTED" | "REJECTED" | "FAILED"
  resultSummary: string | null
  createdAt: string
}

export interface ConversationSummary {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: AiMessage[]
  actions: AiPendingAction[]
}

export function fetchAssistantStatus() {
  return apiFetchSafe<{ configured: boolean; provider: string | null; model: string | null }>(
    "/ai-assistant/status"
  )
}

export async function sendChatMessage(actingEmployeeId: string, message: string, conversationId?: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/ai-assistant/chat", {
    method: "POST",
    body: JSON.stringify({ actingEmployeeId, message, conversationId }),
  })
}

export function fetchConversations(actingEmployeeId: string) {
  return apiFetchSafe<ConversationSummary[]>(`/ai-assistant/conversations?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`)
}

export function fetchConversation(id: string, actingEmployeeId: string) {
  return apiFetchSafe<ConversationDetail>(`/ai-assistant/conversations/${id}?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`)
}

export async function confirmPendingAction(id: string, actingEmployeeId: string): Promise<AiPendingAction> {
  return apiFetch<AiPendingAction>(`/ai-assistant/actions/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify({ actingEmployeeId }),
  })
}

export async function rejectPendingAction(id: string, actingEmployeeId: string): Promise<AiPendingAction> {
  return apiFetch<AiPendingAction>(`/ai-assistant/actions/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ actingEmployeeId }),
  })
}

export interface AuditLogRow {
  id: string
  employeeId: string
  conversationId: string | null
  eventType: string
  detail: unknown
  createdAt: string
  employee: { firstName: string; lastName: string; employeeNumber: string }
}

export function fetchAuditLog(actingEmployeeId: string, params?: { eventType?: string; page?: number }) {
  const query = new URLSearchParams({ actingEmployeeId })
  if (params?.eventType) query.set("eventType", params.eventType)
  if (params?.page) query.set("page", String(params.page))
  return apiFetchSafe<{ rows: AuditLogRow[]; total: number; page: number; pageSize: number }>(`/ai-assistant/audit-log?${query.toString()}`)
}

export const SUGGESTED_PROMPTS = [
  "What's our current headcount and how has it changed this year?",
  "Show me the attrition rate by department.",
  "What's our mandatory training compliance rate?",
  "Summarize open recruitment requisitions.",
  "What's the leave utilization for this year?",
  "Generate an Excel workforce report.",
]
