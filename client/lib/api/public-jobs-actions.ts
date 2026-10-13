"use server"

import { apiUpload, ApiError } from "./client"

export interface ApplyState {
  error?: string
  success?: boolean
}

const TEXT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "nationality",
  "education",
  "experience",
  "certifications",
  "skills",
  "linkedinUrl",
  "currentEmployer",
  "currentPosition",
  "coverNote",
]

/** Public (no-login) application — forwards text fields and uploaded files to the API. */
export async function applyToJob(slug: string, _prev: ApplyState | undefined, formData: FormData): Promise<ApplyState> {
  const body = new FormData()
  for (const key of TEXT_FIELDS) {
    const value = String(formData.get(key) ?? "").trim()
    if (value) body.append(key, value)
  }
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) body.append(key, value, value.name)
  }
  try {
    await apiUpload(`/public/jobs/${encodeURIComponent(slug)}/apply`, body)
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Something went wrong. Please try again." }
  }
  return { success: true }
}
