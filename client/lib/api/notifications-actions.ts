"use server"

import { apiFetch } from "./client"
import { fetchMyOverdueMandatory, fetchTeamOverdueMandatory, type CourseAssignment } from "./learning"

/**
 * Backs the header notification bell (components/portal/notification-bell.tsx).
 * `type` is deliberately `string`, not a closed union — NotificationType has
 * 43 values spanning Leave, Learning, Recruitment, Forms, Employee Relations,
 * Onboarding Documents, Exit Process, Bulk Imports, and Professional Profile
 * (see server/prisma/schema.prisma), several written by string literal
 * rather than the Prisma enum import — a closed client union would just go
 * stale again the next time a module adds a type.
 */
export interface AppNotification {
  id: string
  recipientEmployeeId: string
  type: string
  title: string
  message: string
  isRead: boolean
  relatedLeaveRequestId: string | null
  /** Generic "this notification is about employee X" reference — used by
   *  everything other than leave notifications (e.g. probation/contract
   *  ending soon) so an admin-facing notification can deep-link straight to
   *  the employee record it concerns. See Notification.relatedEmployeeId's
   *  schema doc comment. */
  relatedEmployeeId: string | null
  /** Relative app path to the specific record this notification is about
   *  (e.g. "/staff/forms/abc123") — set server-side at creation time by the
   *  module that fired the notification. Takes priority over
   *  resolveNotificationHref's type-based fallback whenever present; see
   *  Notification.actionUrl's schema doc comment. */
  actionUrl: string | null
  createdAt: string
}

export interface OverdueTrainingAlert {
  id: string
  courseName: string
  dueDate: string | null
  /** Set only for the "team" bucket — whose overdue course this is. */
  employee: { firstName: string; lastName: string } | null
}

// Server Actions called imperatively (not via <form action>) from the
// client-side NotificationBell — Next.js allows invoking a "use server"
// export as a plain async function from a Client Component, which is what
// lets a header dropdown fetch/mutate without a dedicated API route.

export async function getMyNotifications(employeeId: string): Promise<AppNotification[]> {
  try {
    return await apiFetch<AppNotification[]>(`/notifications/employee/${employeeId}`)
  } catch {
    return []
  }
}

export async function markNotificationRead(id: string) {
  try {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" })
  } catch {
    // Best-effort — worst case it shows unread again next time the bell opens.
  }
}

export async function markAllNotificationsRead(employeeId: string) {
  try {
    await apiFetch(`/notifications/employee/${employeeId}/read-all`, { method: "POST" })
  } catch {
    // Best-effort, same as above.
  }
}

/**
 * Overdue mandatory training never creates stored Notification rows — it's
 * computed live from LearningAnalyticsService (see MandatoryTrainingBanner's
 * doc comment), not read from the notifications table. The bell surfaces it
 * as a second section anyway: same "needs your attention" concept the
 * dashboard banner already shows, just also reachable from the header.
 */
export async function getOverdueTrainingAlerts(
  employeeId: string
): Promise<{ mine: OverdueTrainingAlert[]; team: OverdueTrainingAlert[] }> {
  const [mineResult, teamResult] = await Promise.all([
    fetchMyOverdueMandatory(employeeId),
    fetchTeamOverdueMandatory(employeeId),
  ])

  const toAlert = (a: CourseAssignment, withEmployee: boolean): OverdueTrainingAlert => ({
    id: a.id,
    courseName: a.course.name,
    dueDate: a.dueDate,
    employee: withEmployee ? { firstName: a.employee.firstName, lastName: a.employee.lastName } : null,
  })

  const mine = mineResult.ok ? mineResult.data.map((a) => toAlert(a, false)) : []
  const team = teamResult.ok
    ? teamResult.data.filter((a) => a.employee.employeeNumber !== employeeId).map((a) => toAlert(a, true))
    : []

  return { mine, team }
}
