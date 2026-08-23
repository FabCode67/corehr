import type { Role } from "./session"

/**
 * Fallback router for notifications that predate Notification.actionUrl (or
 * for the rare type that intentionally has no specific record to deep-link
 * to). Every notification created going forward carries its own actionUrl
 * set server-side at creation time — see notification-bell.tsx's `n.actionUrl
 * ?? resolveNotificationHref(...)` call — so this only ever runs for older
 * rows or gaps, routing to the best generic list/queue page available.
 *

 * `role` matters because this same bell renders in both the admin and
 * staff portals, and several notification types can land on either an
 * ordinary staff member (their own leave/course/form) or a manager/HR admin
 * (an approval or review queue) depending on who the recipient actually is
 * — see LeaveRequestsService/NotificationsService callers for how each type
 * is fired.
 */
export function resolveNotificationHref(
  type: string,
  role: Role,
  relatedLeaveRequestId: string | null,
  relatedEmployeeId: string | null = null
): string {
  switch (type) {
    // ---- Probation / Contract ending soon -------------------------------
    // Employee-facing: land on their own profile. Admin-facing: deep-link
    // straight to the specific employee record via relatedEmployeeId (the
    // one NotificationType pair besides leave that carries an entity
    // reference — see Notification.relatedEmployeeId) rather than a
    // generic list the admin would have to search through.
    case "PROBATION_ENDING_SOON":
    case "CONTRACT_ENDING_SOON":
      return "/staff/profile"
    case "PROBATION_ENDING_SOON_ADMIN":
    case "CONTRACT_ENDING_SOON_ADMIN":
      return relatedEmployeeId ? `/admin/employees/${relatedEmployeeId}` : "/admin/employees"
    // ---- Leave -------------------------------------------------------
    case "APPROVAL_NEEDED":
      // Sent to whoever's turn it is to decide — a line manager (staff
      // role) or HR (admin role); see LeaveRequestsService.resolveLineManagerId.
      return role === "admin" ? "/admin/leave/approvals" : "/staff/leave/approvals"
    case "LEAVE_SUBMITTED":
    case "LEAVE_APPROVED":
    case "LEAVE_REJECTED":
    case "LEAVE_CANCELLED":
    case "LEAVE_STARTING_SOON":
    case "RETURNING_TOMORROW":
    case "LOW_BALANCE":
    case "LEAVE_CARRY_FORWARD_EXPIRING":
      return "/staff/leave"

    // ---- Learning ------------------------------------------------------
    case "COURSE_ASSIGNED":
    case "COURSE_DUE_SOON":
    case "COURSE_OVERDUE":
    case "CERTIFICATE_APPROVED":
    case "CERTIFICATE_REJECTED":
    case "MANDATORY_TRAINING_INCOMPLETE":
      return "/staff/learning"

    // ---- Recruitment (admin/recruiter-facing only — no staff-side
    // recruitment surface exists) ----------------------------------------
    case "INTERVIEW_SCHEDULED":
    case "OFFER_ACCEPTED":
    case "OFFER_DECLINED":
      return "/admin/recruitment/applications"

    // ---- Forms ---------------------------------------------------------
    case "FORM_ASSIGNED":
    case "FORM_DUE_SOON":
    case "FORM_OVERDUE":
    case "FORM_SIGNATURE_REQUIRED":
    case "FORM_APPROVED":
    case "FORM_REJECTED":
      return "/staff/forms"
    case "FORM_COMPLETED":
      return role === "admin" ? "/admin/forms/completed" : "/staff/forms"

    // ---- Employee Relations (Cases) ------------------------------------
    case "ERC_MANAGER_INPUT_NEEDED":
    case "ERC_INVESTIGATION_OVERDUE":
    case "ERC_APPEAL_SUBMITTED":
      return "/admin/employee-relations/cases"
    case "ERC_MEETING_SCHEDULED":
    case "ERC_DECISION_ISSUED":
    case "ERC_APPEAL_DECIDED":
      return role === "admin" ? "/admin/employee-relations/cases" : "/staff/employee-relations"

    // ---- Onboarding Documents -------------------------------------------
    case "ONBOARDING_DOCUMENT_UPLOADED":
      return "/admin/onboarding-documents"
    case "ONBOARDING_DOCUMENT_ASSIGNED":
    case "ONBOARDING_DOCUMENT_APPROVED":
    case "ONBOARDING_DOCUMENT_REJECTED":
    case "ONBOARDING_DOCUMENT_RESUBMISSION_REQUIRED":
      return "/staff/onboarding"

    // ---- Exit Process (admin/HR-facing) ---------------------------------
    case "EXIT_PROCESS_STARTED":
      return "/admin/employees"

    // ---- Bulk Imports (admin-only) --------------------------------------
    case "BULK_IMPORT_COMPLETED":
      return "/admin/imports/history"

    // ---- Professional Profile -------------------------------------------
    case "EDUCATION_VERIFIED":
    case "EDUCATION_REJECTED":
    case "CERTIFICATION_VERIFIED":
    case "CERTIFICATION_REJECTED":
      return "/staff/professional-profile"
    case "PROFILE_RECORD_PENDING_REVIEW":
      return "/admin/professional-profile/review"

    default:
      // Unrecognized/future type — falls back to a leave-request link if
      // one is attached, otherwise the portal's own dashboard rather than
      // a dead end.
      if (relatedLeaveRequestId) return "/staff/leave"
      return role === "admin" ? "/admin" : "/staff"
  }
}
