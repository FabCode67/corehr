"use server"

import { ApiError, apiUpload } from "./client"

export type UploadFolder = "profile-pictures" | "certificates" | "leave-attachments"

export type UploadResult = { ok: true; url: string } | { ok: false; error: string }

/**
 * Called directly from client components on file selection (not tied to a
 * form's submit) so the wizard can show an instant preview and hand the
 * resulting Cloudinary URL to whichever step form is later saved. Kept as
 * its own Server Action (rather than a REST call from the browser) so the
 * NestJS API URL never needs to be exposed to client bundles.
 */
export async function uploadFile(folder: UploadFolder, file: File): Promise<UploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: "No file selected." }
  }

  const forward = new FormData()
  forward.append("file", file)

  try {
    const result = await apiUpload<{ url: string; publicId: string }>(
      `/uploads?folder=${folder}`,
      forward
    )
    return { ok: true, url: result.url }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ApiError ? error.message : "Upload failed. Please try again.",
    }
  }
}
