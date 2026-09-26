"use server"

import { revalidatePath } from "next/cache"

import { ApiError, apiFetch, apiUpload } from "./client"
import type { ImportJobDetail, ImportPreviewResult } from "./imports"

export interface ImportActionState {
  error?: string
  preview?: ImportPreviewResult
  result?: ImportJobDetail
}

/** Every import mutation can change almost any module's data — revalidate
 *  broadly rather than tracking exact paths per module (same approach as
 *  revalidatePerformancePaths in performance-actions.ts). */
function revalidateImportPaths() {
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/imports/history")
}

export async function previewImport(moduleKey: string, actingEmployeeId: string, file: File): Promise<ImportActionState> {
  if (!file || file.size === 0) {
    return { error: "No file selected." }
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("actingEmployeeId", actingEmployeeId)

  try {
    const preview = await apiUpload<ImportPreviewResult>(`/imports/${moduleKey}/preview`, formData)
    return { preview }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to read and validate the file." }
  }
}

/** Kicks off the import — the server now marks the job IMPORTING and
 *  returns immediately rather than running every row inline (see
 *  ImportsService.commit()'s doc comment), so this resolves quickly with
 *  status still IMPORTING. Callers (ImportManager) poll
 *  checkImportJobAction() until the status moves on. */
export async function commitImport(jobId: string, actingEmployeeId: string): Promise<ImportActionState> {
  try {
    const result = await apiFetch<ImportJobDetail>(`/imports/jobs/${jobId}/commit`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId }),
    })
    return { result }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to run the import." }
  }
}

/** Poll target for a job kicked off by commitImport() — a thin
 *  client-callable wrapper around fetchImportJob() (same pattern as
 *  searchEmployeesAction wrapping a Server-Component fetcher), since
 *  ImportManager is a "use client" component. Revalidates the paths an
 *  import can affect once the job actually leaves IMPORTING, matching what
 *  commitImport() used to do unconditionally on every call. */
export async function checkImportJobAction(jobId: string): Promise<ImportActionState> {
  try {
    const result = await apiFetch<ImportJobDetail>(`/imports/jobs/${jobId}`)
    if (result.status !== "IMPORTING") revalidateImportPaths()
    return { result }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to check the import's progress." }
  }
}

export async function reimportJob(jobId: string, actingEmployeeId: string): Promise<ImportActionState> {
  try {
    const preview = await apiFetch<ImportPreviewResult>(`/imports/jobs/${jobId}/reimport`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId }),
    })
    return { preview }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to re-run this import." }
  }
}
