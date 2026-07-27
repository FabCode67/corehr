"use server"

import { revalidatePath } from "next/cache"

import { apiFetch, ApiError } from "./client"
import type { ApprovalDecision, ApprovalRole, LeaveEntitlementCategory } from "./leave"

export interface LeaveActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Every mutation below touches data that could be shown on the staff
 *  self-service page, the admin approvals/calendar/analytics dashboards, or
 *  the HR admin panel — revalidate broadly rather than trying to track
 *  exactly which pages are live at any given point in the build-out. */
function revalidateLeavePaths() {
  revalidatePath("/staff/leave")
  revalidatePath("/admin/leave")
  revalidatePath("/admin/leave/approvals")
  revalidatePath("/admin/leave/calendar")
  revalidatePath("/admin/leave/analytics")
  revalidatePath("/admin/leave/settings")
}

// ---- Requests ---------------------------------------------------------

export async function previewLeaveDays(startDate: string, endDate: string) {
  return apiFetch<{ numberOfDays: number; returnDate: string }>("/leave/requests/preview", {
    method: "POST",
    body: JSON.stringify({ startDate, endDate }),
  })
}

export async function submitLeaveRequest(
  employeeId: string,
  _prevState: LeaveActionState | undefined,
  formData: FormData
): Promise<LeaveActionState> {
  const leaveTypeId = trimmedOrUndefined(formData.get("leaveTypeId"))
  const startDate = trimmedOrUndefined(formData.get("startDate"))
  const endDate = trimmedOrUndefined(formData.get("endDate"))
  const reason = trimmedOrUndefined(formData.get("reason"))

  if (!leaveTypeId || !startDate || !endDate) {
    return { error: "Leave type, start date, and end date are required." }
  }
  if (!reason || reason.length < 3) {
    return { error: "Please provide a reason for this leave request." }
  }

  try {
    await apiFetch("/leave/requests", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        returnDate: trimmedOrUndefined(formData.get("returnDate")),
        reason,
        attachmentUrl: trimmedOrUndefined(formData.get("attachmentUrl")),
        delegateEmployeeId: trimmedOrUndefined(formData.get("delegateEmployeeId")),
        hrOverride: formData.get("hrOverride") === "on",
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit leave request." }
  }

  revalidateLeavePaths()
  return {}
}

export async function decideApproval(
  requestId: string,
  decision: ApprovalDecision,
  actingEmployeeId: string | undefined,
  comment: string | undefined
): Promise<LeaveActionState> {
  try {
    await apiFetch(`/leave/requests/${requestId}/decide`, {
      method: "POST",
      body: JSON.stringify({ decision, comment, actingEmployeeId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to record decision." }
  }

  revalidateLeavePaths()
  return {}
}

export async function cancelLeaveRequest(id: string): Promise<LeaveActionState> {
  try {
    await apiFetch(`/leave/requests/${id}/cancel`, { method: "POST" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to cancel leave request." }
  }

  revalidateLeavePaths()
  return {}
}

// ---- Notifications --------------------------------------------------------

export async function markNotificationRead(id: string) {
  await apiFetch(`/notifications/${id}/read`, { method: "PATCH" })
  revalidateLeavePaths()
}

export async function markAllNotificationsRead(employeeId: string) {
  await apiFetch(`/notifications/employee/${employeeId}/read-all`, { method: "POST" })
  revalidateLeavePaths()
}

// ---- Balances (HR admin) -----------------------------------------------

export async function adjustLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  _prevState: LeaveActionState | undefined,
  formData: FormData
): Promise<LeaveActionState> {
  const adjustmentDays = Number(formData.get("adjustmentDays"))
  if (Number.isNaN(adjustmentDays)) {
    return { error: "Adjustment must be a number." }
  }

  try {
    await apiFetch(`/leave/balances/employee/${employeeId}/${leaveTypeId}?year=${year}`, {
      method: "PATCH",
      body: JSON.stringify({ adjustmentDays }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to adjust balance." }
  }

  revalidateLeavePaths()
  return {}
}

export async function runCarryForward(fromYear: number, toYear: number): Promise<LeaveActionState> {
  try {
    await apiFetch(`/leave/balances/carry-forward?fromYear=${fromYear}&toYear=${toYear}`, {
      method: "POST",
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to run carry-forward." }
  }

  revalidateLeavePaths()
  return {}
}

// ---- Leave Types (HR admin) ---------------------------------------------

export async function createLeaveType(
  _prevState: LeaveActionState | undefined,
  formData: FormData
): Promise<LeaveActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  const category = trimmedOrUndefined(formData.get("category"))

  if (!name || !category) {
    return { error: "Name and category are required." }
  }

  try {
    await apiFetch("/leave/types", {
      method: "POST",
      body: JSON.stringify({
        name,
        category,
        code: trimmedOrUndefined(formData.get("code")),
        affectsAnnualBalance: formData.get("affectsAnnualBalance") === "on",
        genderRestriction: trimmedOrUndefined(formData.get("genderRestriction")),
        maxDaysPerYear: trimmedOrUndefined(formData.get("maxDaysPerYear"))
          ? Number(formData.get("maxDaysPerYear"))
          : undefined,
        requiresDocumentation: formData.get("requiresDocumentation") === "on",
        documentationThresholdDays: trimmedOrUndefined(formData.get("documentationThresholdDays"))
          ? Number(formData.get("documentationThresholdDays"))
          : undefined,
        requiresHrApproval: formData.get("requiresHrApproval") === "on",
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create leave type." }
  }

  revalidatePath("/admin/leave/settings")
  return {}
}

export async function updateLeaveType(
  id: string,
  _prevState: LeaveActionState | undefined,
  formData: FormData
): Promise<LeaveActionState> {
  try {
    await apiFetch(`/leave/types/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: trimmedOrUndefined(formData.get("name")),
        code: trimmedOrUndefined(formData.get("code")),
        category: trimmedOrUndefined(formData.get("category")),
        affectsAnnualBalance: formData.has("affectsAnnualBalance")
          ? formData.get("affectsAnnualBalance") === "on"
          : undefined,
        genderRestriction: trimmedOrUndefined(formData.get("genderRestriction")) ?? null,
        maxDaysPerYear: trimmedOrUndefined(formData.get("maxDaysPerYear"))
          ? Number(formData.get("maxDaysPerYear"))
          : undefined,
        requiresDocumentation: formData.has("requiresDocumentation")
          ? formData.get("requiresDocumentation") === "on"
          : undefined,
        documentationThresholdDays: trimmedOrUndefined(formData.get("documentationThresholdDays"))
          ? Number(formData.get("documentationThresholdDays"))
          : undefined,
        requiresHrApproval: formData.has("requiresHrApproval")
          ? formData.get("requiresHrApproval") === "on"
          : undefined,
        isActive: formData.has("isActive") ? formData.get("isActive") === "on" : undefined,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update leave type." }
  }

  revalidatePath("/admin/leave/settings")
  return {}
}

export async function deactivateLeaveType(id: string) {
  await apiFetch(`/leave/types/${id}`, { method: "DELETE" })
  revalidatePath("/admin/leave/settings")
}

export async function upsertEntitlementRule(
  leaveTypeId: string,
  employeeCategory: LeaveEntitlementCategory,
  days: number
): Promise<LeaveActionState> {
  try {
    await apiFetch(`/leave/types/${leaveTypeId}/entitlement-rules`, {
      method: "PUT",
      body: JSON.stringify({ employeeCategory, days }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update entitlement rule." }
  }

  revalidatePath("/admin/leave/settings")
  return {}
}

export async function removeEntitlementRule(leaveTypeId: string, employeeCategory: LeaveEntitlementCategory) {
  await apiFetch(`/leave/types/${leaveTypeId}/entitlement-rules/${employeeCategory}`, { method: "DELETE" })
  revalidatePath("/admin/leave/settings")
}

export async function replaceApprovalSteps(
  leaveTypeId: string,
  steps: Array<{ order: number; role: ApprovalRole }>
): Promise<LeaveActionState> {
  try {
    await apiFetch(`/leave/types/${leaveTypeId}/approval-steps`, {
      method: "PUT",
      body: JSON.stringify({ steps }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update approval workflow." }
  }

  revalidatePath("/admin/leave/settings")
  return {}
}

export async function upsertCarryForwardRule(
  leaveTypeId: string,
  enabled: boolean,
  maxDays: number | undefined,
  expiresAfterDays: number | undefined
): Promise<LeaveActionState> {
  try {
    await apiFetch(`/leave/types/${leaveTypeId}/carry-forward-rule`, {
      method: "PUT",
      body: JSON.stringify({ enabled, maxDays, expiresAfterDays }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update carry-forward rule." }
  }

  revalidatePath("/admin/leave/settings")
  return {}
}

// ---- Public Holidays (HR admin) -----------------------------------------

export async function createHoliday(
  _prevState: LeaveActionState | undefined,
  formData: FormData
): Promise<LeaveActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  const date = trimmedOrUndefined(formData.get("date"))

  if (!name || !date) {
    return { error: "Name and date are required." }
  }

  try {
    await apiFetch("/leave/holidays", {
      method: "POST",
      body: JSON.stringify({ name, date, isRecurringAnnually: formData.get("isRecurringAnnually") === "on" }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to add holiday." }
  }

  revalidatePath("/admin/leave/settings")
  revalidatePath("/admin/leave/calendar")
  return {}
}

export async function updateHoliday(
  id: string,
  _prevState: LeaveActionState | undefined,
  formData: FormData
): Promise<LeaveActionState> {
  try {
    await apiFetch(`/leave/holidays/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: trimmedOrUndefined(formData.get("name")),
        date: trimmedOrUndefined(formData.get("date")),
        isRecurringAnnually: formData.has("isRecurringAnnually")
          ? formData.get("isRecurringAnnually") === "on"
          : undefined,
        isActive: formData.has("isActive") ? formData.get("isActive") === "on" : undefined,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update holiday." }
  }

  revalidatePath("/admin/leave/settings")
  revalidatePath("/admin/leave/calendar")
  return {}
}

export async function removeHoliday(id: string) {
  await apiFetch(`/leave/holidays/${id}`, { method: "DELETE" })
  revalidatePath("/admin/leave/settings")
  revalidatePath("/admin/leave/calendar")
}

// ---- Leave Settings (HR admin) ------------------------------------------

export async function updateLeaveSettings(
  _prevState: LeaveActionState | undefined,
  formData: FormData
): Promise<LeaveActionState> {
  const weekendDaysRaw = formData.getAll("weekendDays")
  const weekendDays = weekendDaysRaw.length > 0 ? weekendDaysRaw.map((value) => Number(value)) : undefined

  try {
    await apiFetch("/leave/settings", {
      method: "PATCH",
      body: JSON.stringify({
        weekendDays,
        excludeWeekends: formData.has("excludeWeekends") ? formData.get("excludeWeekends") === "on" : undefined,
        excludePublicHolidays: formData.has("excludePublicHolidays")
          ? formData.get("excludePublicHolidays") === "on"
          : undefined,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update leave settings." }
  }

  revalidatePath("/admin/leave/settings")
  return {}
}
