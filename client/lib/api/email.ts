import { apiFetchSafe } from "./client"

// ---- Types (mirrors server/prisma/schema.prisma's Email Notification section) --------

export type EmailStatus = "PENDING" | "SENT" | "FAILED" | "RETRYING"

export interface EmailTemplate {
  id: string
  key: string
  name: string
  category: string
  subject: string
  bodyHtml: string
  variables: string[]
  isActive: boolean
  isMandatory: boolean
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface EmailLog {
  id: string
  templateKey: string
  recipientEmail: string
  recipientEmployeeId: string | null
  recipientEmployee: { employeeNumber: string; firstName: string; lastName: string } | null
  subject: string
  bodyHtml: string
  variables: Record<string, unknown>
  status: EmailStatus
  failureReason: string | null
  retryCount: number
  maxRetries: number
  nextAttemptAt: string
  sentAt: string | null
  relatedModule: string | null
  relatedEntityId: string | null
  createdAt: string
}

export interface EmailLogPage {
  data: EmailLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface NotificationPreference {
  id: string
  employeeId: string
  emailEnabled: boolean
  inAppEnabled: boolean
  leaveEmails: boolean
  performanceEmails: boolean
  learningEmails: boolean
  recruitmentEmails: boolean
  exitEmails: boolean
  approvalEmails: boolean
  updatedAt: string
}

// ---- Fetchers (Server Components) -----------------------------------------

export function fetchEmailTemplates(category?: string) {
  return apiFetchSafe<EmailTemplate[]>(`/email-templates${category ? `?category=${category}` : ""}`)
}

export function fetchEmailTemplate(id: string) {
  return apiFetchSafe<EmailTemplate>(`/email-templates/${id}`)
}

export function fetchEmailLogs(filters: { status?: string; relatedModule?: string; search?: string; page?: number } = {}) {
  const search = new URLSearchParams()
  if (filters.status) search.set("status", filters.status)
  if (filters.relatedModule) search.set("relatedModule", filters.relatedModule)
  if (filters.search) search.set("search", filters.search)
  if (filters.page) search.set("page", String(filters.page))
  const query = search.toString()
  return apiFetchSafe<EmailLogPage>(`/email-logs${query ? `?${query}` : ""}`)
}

export function fetchEmailStats() {
  return apiFetchSafe<Record<EmailStatus, number>>("/email-logs/stats")
}

export function fetchNotificationPreference(employeeId: string) {
  return apiFetchSafe<NotificationPreference>(`/notification-preferences/employee/${employeeId}`)
}
