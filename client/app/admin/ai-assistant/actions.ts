"use server"

import { revalidatePath } from "next/cache"

import { ApiError } from "@/lib/api/client"
import { confirmPendingAction, rejectPendingAction, sendChatMessage, type AiPendingAction, type ChatResponse } from "@/lib/api/ai-assistant"

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function sendMessageAction(actingEmployeeId: string, message: string, conversationId?: string): Promise<ActionResult<ChatResponse>> {
  try {
    const data = await sendChatMessage(actingEmployeeId, message, conversationId)
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : "Couldn't reach the assistant. Please try again." }
  }
}

export async function confirmActionAction(id: string, actingEmployeeId: string): Promise<ActionResult<AiPendingAction>> {
  try {
    const data = await confirmPendingAction(id, actingEmployeeId)
    revalidatePath("/admin/ai-assistant")
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : "Failed to confirm this action." }
  }
}

export async function rejectActionAction(id: string, actingEmployeeId: string): Promise<ActionResult<AiPendingAction>> {
  try {
    const data = await rejectPendingAction(id, actingEmployeeId)
    revalidatePath("/admin/ai-assistant")
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: error instanceof ApiError ? error.message : "Failed to reject this action." }
  }
}
