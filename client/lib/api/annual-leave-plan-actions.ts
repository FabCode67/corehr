"use server"

import { revalidatePath } from "next/cache"

import { ApiError, apiUpload } from "./client"
import type { AnnualLeavePlanUploadSummary } from "./annual-leave-plan"

export type AnnualLeavePlanUploadState = { summary?: AnnualLeavePlanUploadSummary; error?: string }

/** Uploads directly to the NestJS API (not through a Next.js proxy route) —
 *  this runs server-side as a Server Action, so it can hit API_URL directly
 *  the same way lib/api/uploads.ts's uploadFile() does; only browser-
 *  triggered downloads (the template/export links) need a proxy route. */
export async function uploadAnnualLeavePlan(
  departmentId: string,
  actingEmployeeId: string,
  year: number,
  file: File
): Promise<AnnualLeavePlanUploadState> {
  if (!file || file.size === 0) {
    return { error: "No file selected." }
  }

  const formData = new FormData()
  formData.append("file", file)

  try {
    const summary = await apiUpload<AnnualLeavePlanUploadSummary>(
      `/department-dashboard/${departmentId}/leave-plan/upload?actingEmployeeId=${actingEmployeeId}&year=${year}`,
      formData
    )
    revalidatePath("/staff/department-dashboard/leave-plan")
    return { summary }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to upload the annual leave plan." }
  }
}
