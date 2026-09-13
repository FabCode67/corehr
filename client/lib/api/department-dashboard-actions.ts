"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { apiFetch, ApiError } from "./client"

export interface DepartmentActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Creates a job requisition for a department head's own department — the
 * one write action this portal grants (see DepartmentDashboardService's
 * module doc comment). requestedById/hiringManagerId are deliberately NOT
 * collected here — the server always forces both to actingEmployeeId
 * regardless of what this form sends, so there's no point asking.
 */
export async function createDepartmentRequisition(
  departmentId: string,
  actingEmployeeId: string,
  _prevState: DepartmentActionState | undefined,
  formData: FormData
): Promise<DepartmentActionState> {
  const workforcePlanId = trimmedOrUndefined(formData.get("workforcePlanId"))
  const positionId = trimmedOrUndefined(formData.get("positionId"))
  const newPositionTitle = trimmedOrUndefined(formData.get("newPositionTitle"))
  const bandId = trimmedOrUndefined(formData.get("bandId"))
  const numberOfVacancies = trimmedOrUndefined(formData.get("numberOfVacancies"))
  const contractType = trimmedOrUndefined(formData.get("contractType"))
  const branchId = trimmedOrUndefined(formData.get("branchId"))
  const employmentType = trimmedOrUndefined(formData.get("employmentType"))
  const hiringReason = trimmedOrUndefined(formData.get("hiringReason"))

  if (!workforcePlanId || !bandId || !numberOfVacancies || !contractType || !branchId || !employmentType || !hiringReason) {
    return { error: "All required requisition fields must be filled in." }
  }
  if (!positionId && !newPositionTitle) {
    return { error: "Select an existing position or provide a title for a new one." }
  }

  const newPosition = !positionId
    ? {
        title: newPositionTitle,
        departmentId,
        unitId: trimmedOrUndefined(formData.get("newPositionUnitId")),
        levelId: trimmedOrUndefined(formData.get("newPositionLevelId")),
        reportsToPositionId: trimmedOrUndefined(formData.get("newPositionReportsToPositionId")),
      }
    : undefined

  if (newPosition && !newPosition.levelId) {
    return { error: "A new position needs a level." }
  }

  let requisitionId: string
  try {
    const requisition = await apiFetch<{ id: string }>(
      `/department-dashboard/${departmentId}/requisitions?actingEmployeeId=${actingEmployeeId}`,
      {
        method: "POST",
        body: JSON.stringify({
          workforcePlanId,
          positionId,
          newPosition,
          bandId,
          numberOfVacancies: Number(numberOfVacancies),
          contractType,
          branchId,
          employmentType,
          hiringReason,
          // Always forced server-side too — sent here only because the DTO
          // requires the fields to be present; the real values used are
          // whatever DepartmentDashboardService.createRequisition() sets.
          requestedById: actingEmployeeId,
          hiringManagerId: actingEmployeeId,
          priority: trimmedOrUndefined(formData.get("priority")),
          targetStartDate: trimmedOrUndefined(formData.get("targetStartDate")),
          jobDescriptionId: trimmedOrUndefined(formData.get("jobDescriptionId")),
        }),
      }
    )
    requisitionId = requisition.id
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the job requisition." }
  }

  revalidatePath("/staff/department-dashboard/requisitions")
  redirect(`/staff/department-dashboard/requisitions?dept=${departmentId}&created=${requisitionId}`)
}

/** Balance adjustment — the one leave write that doesn't reuse a generic
 *  /leave/requests endpoint (see lib/api/department-dashboard.ts's doc
 *  comment on the leave section), since LeaveBalancesService.adjust() has
 *  no actingEmployeeId/authorization concept of its own — access is gated
 *  entirely by DepartmentDashboardService.adjustLeaveBalance(). */
export async function adjustDepartmentLeaveBalance(
  departmentId: string,
  actingEmployeeId: string,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  _prevState: DepartmentActionState | undefined,
  formData: FormData
): Promise<DepartmentActionState> {
  const adjustmentDays = Number(formData.get("adjustmentDays"))
  if (Number.isNaN(adjustmentDays)) {
    return { error: "Adjustment must be a number." }
  }

  try {
    await apiFetch(
      `/department-dashboard/${departmentId}/leave/balances/${employeeId}/${leaveTypeId}?actingEmployeeId=${actingEmployeeId}&year=${year}`,
      { method: "PATCH", body: JSON.stringify({ adjustmentDays }) }
    )
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to adjust balance." }
  }

  revalidatePath("/staff/department-dashboard/leave")
  return {}
}
