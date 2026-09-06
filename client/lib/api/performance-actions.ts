"use server"

import { revalidatePath } from "next/cache"

import { apiFetch, ApiError } from "./client"
import type { PerformanceReviewType, ReviewFilters } from "./performance"

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

export interface PerformanceActionState {
  error?: string
}

function trimmedOrUndefined(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Every mutation below can affect the review-period admin page, any
 *  review's detail page, the history view, and every dashboard filter
 *  combination — revalidate broadly rather than tracking exact paths. */
function revalidatePerformancePaths() {
  revalidatePath("/admin/performance")
  revalidatePath("/admin/performance/periods")
  revalidatePath("/admin/performance/rating-scale")
  revalidatePath("/admin/performance/reviews")
  revalidatePath("/admin/performance/dashboard")
  revalidatePath("/staff/performance")
}

// ---- Rating scale (HR admin) ---------------------------------------------

export async function createRatingScaleEntry(
  _prevState: PerformanceActionState | undefined,
  formData: FormData
): Promise<PerformanceActionState> {
  const rank = trimmedOrUndefined(formData.get("rank"))
  const label = trimmedOrUndefined(formData.get("label"))

  if (!rank || !label) {
    return { error: "Rank and label are required." }
  }

  try {
    await apiFetch("/performance/rating-scale", {
      method: "POST",
      body: JSON.stringify({
        rank: Number(rank),
        label,
        description: trimmedOrUndefined(formData.get("description")),
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create rating scale entry." }
  }

  revalidatePerformancePaths()
  return {}
}

export async function updateRatingScaleEntry(
  id: string,
  _prevState: PerformanceActionState | undefined,
  formData: FormData
): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/rating-scale/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        label: trimmedOrUndefined(formData.get("label")),
        description: trimmedOrUndefined(formData.get("description")),
        expectedPercentage: trimmedOrUndefined(formData.get("expectedPercentage"))
          ? Number(formData.get("expectedPercentage"))
          : undefined,
      }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to update rating scale entry." }
  }

  revalidatePerformancePaths()
  return {}
}

// ---- Review periods (HR admin) --------------------------------------------

export async function createReviewPeriod(
  _prevState: PerformanceActionState | undefined,
  formData: FormData
): Promise<PerformanceActionState> {
  const name = trimmedOrUndefined(formData.get("name"))
  const year = trimmedOrUndefined(formData.get("year"))

  if (!name || !year) {
    return { error: "Name and year are required." }
  }

  try {
    await apiFetch("/performance/review-periods", {
      method: "POST",
      body: JSON.stringify({ name, year: Number(year) }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create review period." }
  }

  revalidatePerformancePaths()
  return {}
}

export async function openReviewCycle(periodId: string, cycle: PerformanceReviewType): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/review-periods/${periodId}/open`, {
      method: "POST",
      body: JSON.stringify({ cycle }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to open the review cycle." }
  }

  revalidatePerformancePaths()
  return {}
}

export async function closeReviewCycle(periodId: string, cycle: PerformanceReviewType): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/review-periods/${periodId}/close`, {
      method: "POST",
      body: JSON.stringify({ cycle }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to close the review cycle." }
  }

  revalidatePerformancePaths()
  return {}
}

// ---- Reviews ----------------------------------------------------------------

export async function createReview(params: {
  periodId: string
  employeeId: string
  reviewType: PerformanceReviewType
  actingEmployeeId: string
  reviewerId?: string
}): Promise<PerformanceActionState & { id?: string }> {
  try {
    const review = await apiFetch<{ id: string }>("/performance/reviews", {
      method: "POST",
      body: JSON.stringify(params),
    })
    revalidatePerformancePaths()
    return { id: review.id }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create the review." }
  }
}

export async function updateReview(
  id: string,
  actingEmployeeId: string,
  fields: Record<string, string | number | undefined>
): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ actingEmployeeId, ...fields }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to save the review." }
  }

  revalidatePerformancePaths()
  return {}
}

export async function submitReview(id: string, actingEmployeeId: string): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/reviews/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to submit the review." }
  }

  revalidatePerformancePaths()
  return {}
}

export async function acknowledgeReview(
  id: string,
  actingEmployeeId: string,
  employeeComments?: string
): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/reviews/${id}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, employeeComments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to acknowledge the review." }
  }

  revalidatePerformancePaths()
  return {}
}

export async function finalizeReview(
  id: string,
  actingEmployeeId: string,
  hrComments?: string
): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/reviews/${id}/finalize`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, hrComments }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to finalize the review." }
  }

  revalidatePerformancePaths()
  return {}
}

export async function reassignReviewer(
  id: string,
  actingEmployeeId: string,
  reviewerId: string
): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/reviews/${id}/reassign-reviewer`, {
      method: "POST",
      body: JSON.stringify({ actingEmployeeId, reviewerId }),
    })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to reassign the reviewer." }
  }

  revalidatePerformancePaths()
  return {}
}

/** Deletes one review — admin-only (enforced server-side). For correcting a
 *  mistake (e.g. a bad row from a bulk import), not everyday workflow. */
export async function deleteReview(id: string, actingEmployeeId: string): Promise<PerformanceActionState> {
  try {
    await apiFetch(`/performance/reviews/${id}${toQuery({ actingEmployeeId })}`, { method: "DELETE" })
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to remove the review." }
  }

  revalidatePerformancePaths()
  return {}
}

/** Bulk-deletes every review matching `filters` — the "Remove All"
 *  counterpart to deleteReview() above, for clearing out a bad bulk import
 *  in one action. Pass the Reviews page's currently-applied filters so this
 *  only removes what's actually on screen; an empty filters object removes
 *  every review in the system. Admin-only (enforced server-side). */
export async function deleteAllReviews(
  filters: ReviewFilters,
  actingEmployeeId: string
): Promise<PerformanceActionState & { deletedCount?: number }> {
  try {
    const result = await apiFetch<{ deletedCount: number }>(
      `/performance/reviews${toQuery({ ...filters, actingEmployeeId })}`,
      { method: "DELETE" }
    )
    revalidatePerformancePaths()
    return { deletedCount: result.deletedCount }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to remove the reviews." }
  }
}
