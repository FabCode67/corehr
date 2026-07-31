"use server"

import { revalidatePath } from "next/cache"

import { apiFetch, ApiError } from "./client"

export async function saveHrAnalyticsView(actingEmployeeId: string, name: string, filters: Record<string, string>): Promise<{ error?: string }> {
  try {
    await apiFetch("/hr-analytics/saved-views", { method: "POST", body: JSON.stringify({ actingEmployeeId, name, filters }) })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to save this view." }
  }
  revalidatePath("/admin/hr-analytics")
  return {}
}

export async function deleteHrAnalyticsSavedView(id: string, actingEmployeeId: string): Promise<{ error?: string }> {
  try {
    await apiFetch(`/hr-analytics/saved-views/${id}?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`, { method: "DELETE" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to delete this view." }
  }
  revalidatePath("/admin/hr-analytics")
  return {}
}
