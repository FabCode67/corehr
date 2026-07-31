"use server"

import { revalidatePath } from "next/cache"

import { ApiError, apiFetch } from "./client"
import type { EmailLog, EmailTemplate, NotificationPreference } from "./email"

export interface EmailActionState {
  error?: string
  success?: boolean
}

export async function retryEmail(id: string): Promise<EmailActionState> {
  try {
    await apiFetch<EmailLog>(`/email-logs/${id}/retry`, { method: "POST" })
    revalidatePath("/admin/email/history")
    return { success: true }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to retry this email." }
  }
}

export interface TemplateFormState {
  error?: string
  success?: boolean
}

export async function updateEmailTemplate(id: string, _prevState: TemplateFormState | undefined, formData: FormData): Promise<TemplateFormState> {
  const subject = String(formData.get("subject") ?? "")
  const bodyHtml = String(formData.get("bodyHtml") ?? "")
  const isActive = formData.get("isActive") === "on"

  if (!subject || !bodyHtml) {
    return { error: "Subject and body are required." }
  }

  try {
    await apiFetch<EmailTemplate>(`/email-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ subject, bodyHtml, isActive }),
    })
    revalidatePath("/admin/email/templates")
    return { success: true }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to save this template." }
  }
}

export interface PreferencesFormState {
  error?: string
  success?: boolean
}

export async function updateNotificationPreferences(
  employeeId: string,
  _prevState: PreferencesFormState | undefined,
  formData: FormData
): Promise<PreferencesFormState> {
  const fields = ["emailEnabled", "inAppEnabled", "leaveEmails", "performanceEmails", "learningEmails", "recruitmentEmails", "exitEmails", "approvalEmails"] as const

  const data: Record<string, boolean> = {}
  for (const field of fields) {
    data[field] = formData.get(field) === "on"
  }

  try {
    await apiFetch<NotificationPreference>(`/notification-preferences/employee/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
    revalidatePath("/staff/notification-preferences")
    return { success: true }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to save your notification preferences." }
  }
}
